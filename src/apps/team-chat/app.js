/*
 * Team Chat: channels for a team. Messages are relayed live by the Mixt
 * socket server and kept in server memory (the last 200 per channel).
 * Anyone signed in who knows a channel name can read and post in it.
 */
(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const els = {
        status: $('status'), channels: $('channels'), addForm: $('addForm'), newChannel: $('newChannel'),
        title: $('title'), log: $('log'), err: $('err'), sendForm: $('sendForm'), text: $('text'), send: $('send'),
    };

    const DEFAULT_CHANNELS = ['general', 'random'];
    const state = { socket: null, me: '', channel: '', channels: [] };

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
        div.innerHTML = `<span class="who">${esc(m.from)}</span><span class="when">${esc(fmtTime(m.at))}</span>` +
            `<p>${esc(m.text)}</p>`;
        return div;
    }

    function appendMessage (m) {
        const empty = els.log.querySelector('.empty');
        if (empty) empty.remove();
        const nearBottom = els.log.scrollHeight - els.log.scrollTop - els.log.clientHeight < 80;
        els.log.appendChild(renderMessage(m));
        if (nearBottom || m.from === state.me) els.log.scrollTop = els.log.scrollHeight;
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
        });
    }

    function joinChannel (channel) {
        return new Promise((resolve) => {
            state.socket.emit('chat.join', { channel }, resolve);
        });
    }

    async function openChannel (channel) {
        showError('');
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

    els.sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = els.text.value.trim();
        if (!text || !state.socket || !state.channel) return;
        els.send.disabled = true;
        state.socket.emit('chat.send', { text }, (ack) => {
            els.send.disabled = false;
            if (ack && ack.ok) {
                els.text.value = '';
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
