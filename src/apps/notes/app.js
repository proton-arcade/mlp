/*
 * Notes: rich-text notes kept on this device (IndexedDB). Saves as you type.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const db = window.LocalDB('mixt-notes', ['notes']);
    const itemsEl = $('items');
    const titleEl = $('title');
    const bodyEl = $('body');
    const barEl = $('bar');
    const savedEl = $('saved');

    let notes = [];
    let current = null;     // id of the open note
    let saveTimer = null;

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    const plain = (html) => {
        const d = document.createElement('div');
        d.innerHTML = html;
        return (d.textContent || '').replace(/\s+/g, ' ').trim();
    };

    function sorted () {
        return [...notes].sort((a, b) => b.updated - a.updated);
    }

    function renderList () {
        const q = $('search').value.trim().toLowerCase();
        const shown = sorted().filter((n) => !q || (n.title + ' ' + plain(n.html)).toLowerCase().includes(q));
        if ( ! shown.length ) {
            itemsEl.innerHTML = '<div class="empty">No notes.</div>';
            return;
        }
        itemsEl.innerHTML = shown.map((n) => `
            <div class="item ${n.id === current ? 'active' : ''}" role="listitem" data-id="${esc(n.id)}">
                <div class="t">${esc(n.title || 'Untitled')}</div>
                <div class="s">${esc(plain(n.html).slice(0, 80)) || '&nbsp;'}</div>
            </div>`).join('');
    }

    function showEditor (on) {
        for ( const el of [barEl, titleEl, bodyEl] ) el.classList.toggle('hidden', !on);
        $('none').classList.toggle('hidden', on);
        $('delete').disabled = !on;
    }

    function open (id) {
        const n = notes.find((x) => x.id === id);
        if ( ! n ) return;
        current = id;
        titleEl.value = n.title;
        bodyEl.innerHTML = n.html;
        savedEl.textContent = '';
        showEditor(true);
        renderList();
    }

    async function create () {
        const n = { id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: '', html: '', updated: Date.now() };
        notes.push(n);
        await db.put('notes', n);
        open(n.id);
        titleEl.focus();
    }

    function scheduleSave () {
        savedEl.textContent = 'Saving...';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 400);
    }

    async function save () {
        const n = notes.find((x) => x.id === current);
        if ( ! n ) return;
        n.title = titleEl.value.trim();
        n.html = bodyEl.innerHTML;
        n.updated = Date.now();
        await db.put('notes', n);
        savedEl.textContent = 'Saved';
        renderList();
    }

    itemsEl.addEventListener('click', (e) => {
        const row = e.target.closest('[data-id]');
        if ( row ) open(row.dataset.id);
    });

    $('search').addEventListener('input', renderList);
    $('new').addEventListener('click', create);

    $('delete').addEventListener('click', async () => {
        if ( ! current || ! confirm('Delete this note?') ) return;
        await db.remove('notes', current);
        notes = notes.filter((n) => n.id !== current);
        current = null;
        showEditor(false);
        renderList();
    });

    titleEl.addEventListener('input', scheduleSave);
    bodyEl.addEventListener('input', scheduleSave);

    barEl.addEventListener('mousedown', (e) => {
        if ( e.target.closest('button') ) e.preventDefault(); // keep the caret in the body
    });
    barEl.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cmd]');
        if ( ! btn ) return;
        bodyEl.focus();
        const cmd = btn.dataset.cmd;
        if ( cmd === 'h2' ) document.execCommand('formatBlock', false, 'h2');
        else document.execCommand(cmd, false, null);
        scheduleSave();
    });

    $('export').addEventListener('click', () => {
        const n = notes.find((x) => x.id === current);
        if ( ! n ) return;
        const text = `${n.title}\n\n${bodyEl.innerText}`;
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(n.title || 'note').replace(/[^\w-]+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    });

    async function start () {
        notes = await db.all('notes');
        renderList();
        if ( notes.length ) open(sorted()[0].id);
        else showEditor(false);
    }

    start();
})();
