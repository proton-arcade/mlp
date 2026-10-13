/*
 * Contacts: each account's own address book, stored on the server
 * (/mail/contacts). Contacts are private to the account that made them.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const itemsEl = $('items');
    const formEl = $('form');
    const msgEl = $('msg');
    // Inside the desktop, mixt provides the API origin and token. Opened on
    // its own, the app uses the same token and the api. host beside the page.
    const api = (window.mixt && mixt.APIOrigin) || location.origin.replace('//', '//api.');
    const token = (window.mixt && mixt.authToken) || localStorage.getItem('auth_token_v2') || '';

    let contacts = [];
    let selectedId = null; // null = new contact

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function say (text, bad) {
        msgEl.textContent = text || '';
        msgEl.classList.toggle('bad', !!bad);
    }

    async function call (path, body) {
        const init = { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' };
        if ( body ) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        }
        const resp = await fetch(`${api}${path}`, init);
        const data = await resp.json().catch(() => ({}));
        if ( ! resp.ok ) throw new Error(data.error || data.message || `HTTP ${resp.status}`);
        return data;
    }

    function renderList () {
        const q = $('search').value.trim().toLowerCase();
        const shown = contacts.filter((c) => !q || `${c.name} ${c.address} ${c.phone}`.toLowerCase().includes(q));
        if ( ! shown.length ) {
            itemsEl.innerHTML = '<div class="empty">No contacts.</div>';
            return;
        }
        itemsEl.innerHTML = shown.map((c) => `
            <div class="item ${c.id === selectedId ? 'active' : ''}" role="listitem" data-id="${c.id}">
                <div class="name">${esc(c.name)}</div>
                <div class="sub">${esc(c.address || c.phone || '')}</div>
            </div>`).join('');
    }

    function showForm (c) {
        selectedId = c ? c.id : null;
        $('heading').textContent = c ? c.name : 'New contact';
        $('name').value = c?.name ?? '';
        $('address').value = c?.address ?? '';
        $('phone').value = c?.phone ?? '';
        $('note').value = c?.note ?? '';
        $('delete').hidden = !c;
        formEl.hidden = false;
        renderList();
        $('name').focus();
    }

    async function load () {
        try {
            contacts = await call('/mail/contacts');
            renderList();
        } catch (err) {
            say(err.message, true);
            itemsEl.innerHTML = '<div class="empty">Sign in to use Contacts.</div>';
        }
    }

    itemsEl.addEventListener('click', (e) => {
        const row = e.target.closest('[data-id]');
        if ( !row ) return;
        const c = contacts.find((x) => String(x.id) === row.dataset.id);
        if ( c ) showForm(c);
    });

    $('search').addEventListener('input', renderList);
    $('new').addEventListener('click', () => showForm(null));

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: $('name').value.trim(),
            address: $('address').value.trim(),
            phone: $('phone').value.trim(),
            note: $('note').value,
        };
        if ( selectedId ) payload.id = selectedId;
        try {
            const saved = await call('/mail/contacts', payload);
            say('Saved.');
            selectedId = saved.id;
            await load();
            showForm(contacts.find((c) => c.id === saved.id) ?? null);
        } catch (err) {
            say(err.message, true);
        }
    });

    $('delete').addEventListener('click', async () => {
        if ( ! selectedId || ! confirm('Delete this contact?') ) return;
        try {
            await call('/mail/contacts/delete', { id: selectedId });
            formEl.hidden = true;
            selectedId = null;
            say('Deleted.');
            await load();
        } catch (err) {
            say(err.message, true);
        }
    });

    load();
})();
