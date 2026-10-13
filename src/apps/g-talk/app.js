/*
 * G-Talk: one-to-one chat with another signed-in user. Messages are relayed by
 * the Mixt socket server and kept in server memory (the last 200 per chat).
 * A chat is identified by the two usernames, so both people open the same chat.
 * Anyone signed in who knows both usernames can join that chat, as in Team Chat.
 */
(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const els = {
        status: $('status'), contacts: $('contacts'), addForm: $('addForm'), newContact: $('newContact'),
        peer: $('peer'), log: $('log'), err: $('err'), sendForm: $('sendForm'), text: $('text'), send: $('send'),
    };

    const CONTACTS_KEY = 'gtalk.contacts';
    const LAST_KEY = 'gtalk.last';
    const USERNAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;
    const state = { socket: null, me: '', peer: '', channel: '', contacts: [] };

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function serverOrigin () {
        return window.gui_origin || location.origin;
    }

    function authToken () {
        return (window.mixt && mixt.authToken) || localStorage.getItem('auth_token_v2') || '';
    }

    function setStatus (text) { els.status.textContent = text; }
    function showError (text) { els.err.textContent = text || ''; }

    // A 2-person channel name, the same for both people whatever order they
    // typed the names in. Two 32-bit FNV-1a hashes keep it short and within the
    // server's channel-name rule (lowercase letters, digits and hyphens).
    function fnv1a (str, seed) {
        let h = seed >>> 0;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h.toString(36);
    }

    function chatChannel (a, b) {
        const key = [a.toLowerCase(), b.toLowerCase()].sort().join('\n');
        return 'dm-' + fnv1a(key, 0x811c9dc5) + fnv1a(key, 0x5bd1e995);
    }

    function loadContacts () {
        try {
            const saved = JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
            return Array.isArray(saved) ? saved.filter((n) => USERNAME_RE.test(n)) : [];
        } catch (_) {
            return [];
        }
    }

    function saveContacts () {
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(state.contacts));
    }

    function renderContacts () {
        els.contacts.innerHTML = '';
        for (const name of state.contacts) {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = name;
            b.className = name === state.peer ? 'active' : '';
            b.addEventListener('click', () => openChat(name));
            li.appendChild(b);
            els.contacts.appendChild(li);
        }
    }

    function appendMessage (m) {
        const empty = els.log.querySelector('.empty');
        if (empty) empty.remove();
        const div = document.createElement('div');
        const mine = m.from === state.me;
        div.className = 'msg' + (mine ? ' mine' : '');
        div.innerHTML = `<span class="who">${esc(mine ? 'You' : m.from)}</span>${esc(m.text)}`;
        els.log.appendChild(div);
        els.log.scrollTop = els.log.scrollHeight;
    }

    function renderHistory (list) {
        els.log.innerHTML = '';
        if (!list.length) {
            els.log.innerHTML = '<p class="empty">No messages yet. Say hello.</p>';
            return;
        }
        for (const m of list) appendMessage(m);
    }

    function connect () {
        if (state.socket) return Promise.resolve(state.socket);
        return new Promise((resolve, reject) => {
            const socket = window.io(serverOrigin() + '/', {
                auth: { auth_token: authToken() },
                transports: ['websocket', 'polling'],
                withCredentials: true,
                reconnection: true,
                reconnectionDelay: 1500,
            });
            let first = true;
            socket.on('connect', () => {
                setStatus('Connected');
                state.socket = socket;
                if (first) { first = false; resolve(socket); return; }
                // After a reconnect, rejoin the chat on screen.
                if (state.channel) joinChat(state.channel);
            });
            socket.on('disconnect', () => setStatus('Reconnecting…'));
            socket.on('connect_error', (e) => {
                setStatus('Not connected');
                if (first) { first = false; socket.close(); reject(e); }
            });
            socket.on('chat.message', ({ channel, message }) => {
                if (channel === state.channel) appendMessage(message);
            });
        });
    }

    function joinChat (channel) {
        return new Promise((resolve) => {
            state.socket.emit('chat.join', { channel }, resolve);
        });
    }

    // The server tells us our own username on any join. Learn it once from a
    // shared lobby channel, before the first chat is opened.
    async function ensureMe (socket) {
        if (state.me) return state.me;
        const ack = await joinChat('gtalk-lobby');
        if (ack && ack.ok) state.me = ack.me || '';
        return state.me;
    }

    async function openChat (peer) {
        showError('');
        state.peer = peer;
        localStorage.setItem(LAST_KEY, peer);
        renderContacts();
        els.peer.textContent = peer;
        els.text.disabled = true;
        els.send.disabled = true;
        els.log.innerHTML = '<p class="empty">Loading…</p>';
        let socket;
        try {
            socket = await connect();
            await ensureMe(socket);
        } catch (e) {
            showError('Could not connect to G-Talk.');
            return;
        }
        if (!state.me) {
            showError('Sign in to use G-Talk.');
            return;
        }
        if (state.me.toLowerCase() === peer.toLowerCase()) {
            showError('You cannot start a chat with yourself.');
            return;
        }
        const channel = chatChannel(state.me, peer);
        const ack = await joinChat(channel);
        if (state.peer !== peer) return;   // switched while loading
        if (!ack || !ack.ok) {
            const msg = { bad_channel: 'That name cannot be used for a chat.', rate_limited: 'Too many requests. Wait a moment and try again.' }[ack && ack.error];
            showError(msg || 'Could not open the chat.');
            return;
        }
        state.channel = channel;
        renderHistory(ack.history || []);
        els.text.disabled = false;
        els.send.disabled = false;
        els.text.focus();
    }

    els.sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = els.text.value.trim();
        if (!text || !state.socket || !state.channel) return;
        els.send.disabled = true;
        state.socket.emit('chat.send', { text }, (ack) => {
            els.send.disabled = false;
            if (ack && ack.ok) {
                els.text.value = '';
                showError('');
                els.text.focus();
            } else {
                const msg = {
                    bad_text: 'Messages must be 1 to 2000 characters.',
                    rate_limited: 'You are sending too fast. Wait a moment.',
                    not_joined: 'Open a chat before sending.',
                }[ack && ack.error];
                showError(msg || 'Message not sent.');
            }
        });
    });

    els.addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = els.newContact.value.trim();
        if (!USERNAME_RE.test(name)) {
            showError('Usernames are 1 to 64 letters, digits, dots, underscores or hyphens.');
            return;
        }
        if (!state.contacts.includes(name)) {
            state.contacts.push(name);
            saveContacts();
        }
        els.newContact.value = '';
        openChat(name);
    });

    function boot () {
        state.contacts = loadContacts();
        renderContacts();
        const last = localStorage.getItem(LAST_KEY);
        if (last && state.contacts.includes(last)) openChat(last);
    }

    boot();
})();
