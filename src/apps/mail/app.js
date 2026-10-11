/*
 * Mail: chat-style conversations between accounts on this server.
 * Talks to /mail/* on the API origin with the signed-in account's token.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const threadsEl = $('threads');
    const messagesEl = $('messages');
    const titleEl = $('title');
    const noticeEl = $('notice');
    const composer = $('composer');
    const bodyEl = $('body');
    const toWrap = $('new-to');
    const toEl = $('to');

    let me = null;
    let threads = [];
    let current = null; // username of the open conversation
    let timer = null;

    // Inside the desktop, mixt provides the API origin and token. Opened on
    // its own, the app uses the same token and the api. host beside the page.
    const api = (window.mixt && mixt.APIOrigin) || location.origin.replace('//', '//api.');
    const token = (window.mixt && mixt.authToken) || localStorage.getItem('auth_token_v2') || '';

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function fmtTime (ms) {
        const d = new Date(ms);
        const today = new Date();
        if ( d.toDateString() === today.toDateString() ) {
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    function notice (text) { noticeEl.textContent = text || ''; }

    async function call (path, options = {}) {
        const init = {
            method: options.method || 'GET',
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        };
        if ( options.body !== undefined ) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(options.body);
        }
        const resp = await fetch(`${api}${path}`, init);
        const data = await resp.json().catch(() => ({}));
        if ( ! resp.ok ) throw new Error(data.error || data.message || `HTTP ${resp.status}`);
        return data;
    }

    function renderThreads () {
        const q = $('search').value.trim().toLowerCase();
        const shown = threads.filter((t) => !q || t.with.includes(q));
        if ( ! shown.length ) {
            threadsEl.innerHTML = '<div class="empty">No conversations yet.</div>';
            return;
        }
        threadsEl.innerHTML = shown.map((t) => `
            <div class="thread ${t.with === current ? 'active' : ''}" role="listitem" data-with="${esc(t.with)}">
                <div class="who">
                    <span>${esc(t.address)}</span>
                    ${t.unread ? `<span class="unread">${t.unread}</span>` : ''}
                </div>
                <div class="last">${t.last_from_me ? 'You: ' : ''}${esc(t.last)}</div>
                <div class="when">${fmtTime(t.last_at)}</div>
            </div>`).join('');
    }

    async function loadThreads () {
        threads = await call('/mail/threads');
        renderThreads();
    }

    async function openThread (username) {
        current = username;
        const data = await call(`/mail/thread?with=${encodeURIComponent(username)}`);
        titleEl.textContent = data.address;
        composer.hidden = false;
        messagesEl.innerHTML = data.messages.length
            ? data.messages.map((m) => `
                <div class="bubble ${m.mine ? 'mine' : ''}">${esc(m.body)}
                    <time>${fmtTime(m.created_at)}</time></div>`).join('')
            : '<div class="empty">No messages yet. Say hello.</div>';
        messagesEl.scrollTop = messagesEl.scrollHeight;
        await call('/mail/read', { method: 'POST', body: { with: username } }).catch(() => {});
        renderThreads();
    }

    async function refresh () {
        try {
            await loadThreads();
            if ( current ) await openThread(current);
        } catch (err) {
            notice(err.message);
        }
    }

    threadsEl.addEventListener('click', (e) => {
        const row = e.target.closest('[data-with]');
        if ( ! row ) return;
        toWrap.classList.remove('show');
        openThread(row.dataset.with).catch((err) => notice(err.message));
    });

    $('search').addEventListener('input', renderThreads);

    $('compose').addEventListener('click', () => {
        toWrap.classList.toggle('show');
        if ( toWrap.classList.contains('show') ) toEl.focus();
    });

    $('to-go').addEventListener('click', () => {
        const raw = toEl.value.trim().toLowerCase();
        const username = raw.replace(/@mixt\.mpl$/, '');
        if ( ! /^[a-z0-9._-]{1,50}$/.test(username) ) {
            notice('Enter a valid address like name@mixt.mpl');
            return;
        }
        notice('');
        toWrap.classList.remove('show');
        toEl.value = '';
        current = username;
        titleEl.textContent = `${username}@mixt.mpl`;
        composer.hidden = false;
        messagesEl.innerHTML = '<div class="empty">New conversation. Your first message starts it.</div>';
        renderThreads();
        bodyEl.focus();
    });

    composer.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = bodyEl.value.trim();
        if ( ! text || ! current ) return;
        $('send').disabled = true;
        notice('');
        try {
            await call('/mail/send', { method: 'POST', body: { to: current, body: text } });
            bodyEl.value = '';
            await refresh();
        } catch (err) {
            notice(err.message);
        } finally {
            $('send').disabled = false;
        }
    });

    bodyEl.addEventListener('keydown', (e) => {
        if ( e.key === 'Enter' && !e.shiftKey ) {
            e.preventDefault();
            composer.requestSubmit();
        }
    });

    async function start () {
        try {
            me = await call('/mail/me');
            $('me').textContent = me.address;
            $('sidebar-me').textContent = me.address;
            await loadThreads();
        } catch (err) {
            notice(err.message);
            threadsEl.innerHTML = '<div class="empty">Sign in to use Mail.</div>';
            return;
        }
        timer = setInterval(() => { if ( ! document.hidden ) refresh(); }, 10000);
    }

    start();
})();
