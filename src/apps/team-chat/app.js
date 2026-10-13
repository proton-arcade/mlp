/*
 * Team Chat: channels for a team. Messages are relayed live by the Mixt
 * socket server and kept in server memory (the last 200 per channel).
 * Anyone signed in who knows a channel name can read and post in it.
 * You can edit and delete your own messages, and see who is typing.
 */
(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const els = {
        status: $('status'), channels: $('channels'), addForm: $('addForm'), newChannel: $('newChannel'),
        title: $('title'), log: $('log'), err: $('err'), sendForm: $('sendForm'), text: $('text'), send: $('send'),
        typing: $('typing'),
    };

    const DEFAULT_CHANNELS = ['general', 'random'];
    const TYPING_IDLE_MS = 2500;   // stop sending "typing" after this much idle time
    const TYPING_SHOW_MS = 4000;   // hide a remote typer after this long without an update
    const state = { socket: null, me: '', channel: '', channels: [] };
    let typingSent = false;
    let typingIdleTimer = null;
    const remoteTyping = new Map(); // username -> timer id

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

    function loadChannels () {
        try {
            const saved = JSON.parse(localStorage.getItem('teamchat.channels') || 'null');
            if (Array.isArray(saved) && saved.length) return saved.filter((c) => /^[a-z0-9-]{2,40}$/.test(c));
        } catch (_) { /* fall through */ }
        return DEFAULT_CHANNELS.slice();
    }

    function saveChannels () {
        localStorage.setItem('teamchat.channels', JSON.stringify(state.channels));
    }

    function renderChannels () {
        els.channels.innerHTML = '';
        for (const c of state.channels) {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = '# ' + c;
            b.className = c === state.channel ? 'active' : '';
            b.addEventListener('click', () => openChannel(c));
            li.appendChild(b);
            els.channels.appendChild(li);
        }
    }

    function fmtTime (ms) {
        return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    function renderMessage (m) {
        const div = document.createElement('div');
        div.className = 'msg' + (m.from === state.me ? ' mine' : '');
        div.dataset.id = m.id;
        div.innerHTML =
            (m.from === state.me
                ? '<span class="actions"><button type="button" data-act="edit">Edit</button>' +
                  '<button type="button" class="danger" data-act="delete">Delete</button></span>'
                : '') +
            `<span class="who">${esc(m.from)}</span><span class="when">${esc(fmtTime(m.at))}</span>` +
            `<p>${esc(m.text)}${m.edited ? '<span class="edited">(edited)</span>' : ''}</p>`;
        if (m.from === state.me) {
            div.querySelector('[data-act="edit"]').addEventListener('click', () => startEdit(div, m));
            div.querySelector('[data-act="delete"]').addEventListener('click', () => deleteMessage(m));
        }
        return div;
    }

    function appendMessage (m) {
        const empty = els.log.querySelector('.empty');
        if (empty) empty.remove();
        const nearBottom = els.log.scrollHeight - els.log.scrollTop - els.log.clientHeight < 80;
        els.log.appendChild(renderMessage(m));
        if (nearBottom || m.from === state.me) els.log.scrollTop = els.log.scrollHeight;
    }

    function findMessageEl (id) {
        return Array.from(els.log.querySelectorAll('.msg')).find((d) => d.dataset.id === id) || null;
    }

    function startEdit (div, m) {
        const p = div.querySelector('p');
        const box = document.createElement('textarea');
        box.className = 'edit-box';
        box.rows = 2;
        box.maxLength = 2000;
        box.value = m.text;
        p.replaceWith(box);
        box.focus();
        let done = false;
        const finish = (save) => {
            if (done) return;
            done = true;
            if (!save) {
                box.replaceWith(renderMessage(m));
                return;
            }
            const text = box.value.trim();
            if (!text || text === m.text) {
                box.replaceWith(renderMessage(m));
                return;
            }
            state.socket.emit('chat.edit', { id: m.id, text }, (ack) => {
                if (!ack || !ack.ok) {
                    const msg = { not_author: 'You can only edit your own messages.', bad_text: 'Messages must be 1 to 2000 characters.' }[ack && ack.error];
                    showError(msg || 'Could not edit that message.');
                    box.replaceWith(renderMessage(m));
                    return;
                }
                showError('');
                // chat.updated will refresh the message for everyone, including this tab.
            });
        };
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
            else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
        });
        box.addEventListener('blur', () => finish(false));
    }

    function deleteMessage (m) {
        if (!window.confirm('Delete this message?')) return;
        state.socket.emit('chat.delete', { id: m.id }, (ack) => {
            if (!ack || !ack.ok) {
                const msg = { not_author: 'You can only delete your own messages.' }[ack && ack.error];
                showError(msg || 'Could not delete that message.');
            } else {
                showError('');
            }
        });
    }

    function renderTyping () {
        const names = Array.from(remoteTyping.keys());
        if (!names.length) els.typing.textContent = '';
        else if (names.length === 1) els.typing.textContent = `${names[0]} is typing…`;
        else if (names.length === 2) els.typing.textContent = `${names[0]} and ${names[1]} are typing…`;
        else els.typing.textContent = 'Several people are typing…';
    }

    function setRemoteTyping (from, typing) {
        if (!from || from === state.me) return;
        clearTimeout(remoteTyping.get(from));
        if (typing) {
            remoteTyping.set(from, setTimeout(() => setRemoteTyping(from, false), TYPING_SHOW_MS));
        } else {
            remoteTyping.delete(from);
        }
        renderTyping();
    }

    function clearRemoteTyping () {
        for (const t of remoteTyping.values()) clearTimeout(t);
        remoteTyping.clear();
        renderTyping();
    }

    function sendTyping (typing) {
        if (!state.socket || !state.channel) return;
        if (typing === typingSent) return;
        typingSent = typing;
        state.socket.emit('chat.typing', { typing });
    }

    function noteTyping () {
        sendTyping(true);
        clearTimeout(typingIdleTimer);
        typingIdleTimer = setTimeout(() => sendTyping(false), TYPING_IDLE_MS);
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
                // After a reconnect, rejoin the channel on screen.
                if (state.channel) joinChannel(state.channel);
            });
            socket.on('disconnect', () => setStatus('Reconnecting…'));
            socket.on('connect_error', (e) => {
                if (first) {
                    first = false;
                    socket.close();
                    reject(new Error('Sign in to Mixt to use Team Chat. ' + (e && e.message ? e.message : '')));
                }
            });
            socket.on('chat.message', ({ channel, message }) => {
                if (channel === state.channel) appendMessage(message);
            });
            socket.on('chat.updated', ({ channel, message }) => {
                if (channel !== state.channel) return;
                const old = findMessageEl(message.id);
                if (old) old.replaceWith(renderMessage(message));
            });
            socket.on('chat.deleted', ({ channel, id }) => {
                if (channel !== state.channel) return;
                const old = findMessageEl(id);
                if (old) old.remove();
                if (!els.log.querySelector('.msg')) {
                    els.log.innerHTML = '<div class="empty">No messages yet. Say hello.</div>';
                }
            });
            socket.on('chat.typing', ({ channel, from, typing }) => {
                if (channel === state.channel) setRemoteTyping(from, typing);
            });
        });
    }

    function joinChannel (channel) {
        return new Promise((resolve) => {
            state.socket.emit('chat.join', { channel }, resolve);
        });
    }

    async function openChannel (channel) {
        showError('');
        sendTyping(false);
        clearRemoteTyping();
        state.channel = channel;
        localStorage.setItem('teamchat.last', channel);
        els.title.textContent = '# ' + channel;
        els.log.innerHTML = '<div class="empty">Loading…</div>';
        els.text.disabled = true;
        els.send.disabled = true;
        renderChannels();
        try {
            await connect();
            const ack = await joinChannel(channel);
            if (ack && ack.me) state.me = ack.me;
            if (!ack || !ack.ok) {
                const msg = { bad_channel: 'That channel name is not valid.', rate_limited: 'Too many requests. Wait a moment and try again.' }[ack && ack.error];
                showError(msg || 'Could not open the channel.');
                els.log.innerHTML = '';
                return;
            }
            if (state.channel !== channel) return;   // switched while loading
            els.log.innerHTML = '';
            if (!ack.history.length) {
                els.log.innerHTML = '<div class="empty">No messages yet. Say hello.</div>';
            } else {
                for (const m of ack.history) els.log.appendChild(renderMessage(m));
                els.log.scrollTop = els.log.scrollHeight;
            }
            els.text.disabled = false;
            els.send.disabled = false;
            els.text.focus();
        } catch (err) {
            showError(err.message || 'Could not connect.');
            setStatus('Not connected');
            els.log.innerHTML = '';
        }
    }

    els.text.addEventListener('input', () => {
        if (els.text.value.trim()) noteTyping();
        else sendTyping(false);
    });

    els.sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = els.text.value.trim();
        if (!text || !state.socket || !state.channel) return;
        els.send.disabled = true;
        state.socket.emit('chat.send', { text }, (ack) => {
            els.send.disabled = false;
            if (ack && ack.ok) {
                els.text.value = '';
                sendTyping(false);
                els.text.focus();
                showError('');
            } else {
                const msg = {
                    bad_text: 'Messages must be 1 to 2000 characters.',
                    rate_limited: 'You are sending too fast. Wait a moment.',
                    not_joined: 'Open a channel before sending.',
                }[ack && ack.error];
                showError(msg || 'Message not sent.');
            }
        });
    });

    els.addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = els.newChannel.value.trim().toLowerCase().replace(/\s+/g, '-');
        if (!/^[a-z0-9-]{2,40}$/.test(name)) {
            showError('Channel names are 2 to 40 letters, digits or hyphens.');
            return;
        }
        if (!state.channels.includes(name)) {
            state.channels.push(name);
            saveChannels();
        }
        els.newChannel.value = '';
        openChannel(name);
    });

    async function boot () {
        state.channels = loadChannels();
        renderChannels();
        const last = localStorage.getItem('teamchat.last');
        openChannel(state.channels.includes(last) ? last : state.channels[0]);
    }

    boot();
})();
