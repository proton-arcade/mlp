/*
 * Calendar: month view with events kept on this device (IndexedDB).
 * Dates are stored as local YYYY-MM-DD strings.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const db = window.LocalDB('mixt-calendar', ['events']);
    const grid = $('grid');
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let events = [];
    let view = new Date();          // any date in the month shown
    let selected = null;            // 'YYYY-MM-DD'

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayKey = () => key(new Date());

    function say (text) { $('msg').textContent = text || ''; }

    function renderMonth () {
        const y = view.getFullYear();
        const m = view.getMonth();
        $('title').textContent = view.toLocaleDateString([], { month: 'long', year: 'numeric' });
        const first = new Date(y, m, 1);
        const start = new Date(y, m, 1 - first.getDay());
        const byDay = {};
        for ( const ev of events ) (byDay[ev.date] ||= []).push(ev);

        let html = DOW.map((d) => `<div class="dow">${d}</div>`).join('');
        for ( let i = 0; i < 42; i++ ) {
            const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            const k = key(d);
            const list = (byDay[k] || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const classes = ['day'];
            if ( d.getMonth() !== m ) classes.push('other');
            if ( k === todayKey() ) classes.push('today');
            if ( k === selected ) classes.push('selected');
            html += `<div class="${classes.join(' ')}" role="gridcell" data-date="${k}" tabindex="0">
                <span class="num">${d.getDate()}</span>
                ${list.slice(0, 3).map((ev) => `<span class="chip">${esc(ev.time ? ev.time + ' ' : '')}${esc(ev.title)}</span>`).join('')}
                ${list.length > 3 ? `<span class="muted">+${list.length - 3} more</span>` : ''}
            </div>`;
        }
        grid.innerHTML = html;
    }

    function renderDay () {
        if ( ! selected ) {
            $('day-title').textContent = 'Pick a day';
            $('events').innerHTML = '';
            $('form').hidden = true;
            return;
        }
        const [y, mo, d] = selected.split('-').map(Number);
        const when = new Date(y, mo - 1, d);
        $('day-title').textContent = when.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        const list = events.filter((e) => e.date === selected)
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        $('events').innerHTML = list.length
            ? list.map((e) => `<li data-id="${esc(e.id)}">
                    <button type="button" data-act="delete" aria-label="Delete event">Delete</button>
                    <div class="time">${esc(e.time || 'All day')}</div>
                    <div>${esc(e.title)}</div>
                    ${e.note ? `<div class="muted">${esc(e.note)}</div>` : ''}
                </li>`).join('')
            : '<li class="muted">No events.</li>';
        $('form').hidden = false;
    }

    function renderAll () {
        renderMonth();
        renderDay();
    }

    grid.addEventListener('click', (e) => {
        const cell = e.target.closest('[data-date]');
        if ( !cell ) return;
        selected = cell.dataset.date;
        say('');
        renderAll();
    });
    grid.addEventListener('keydown', (e) => {
        if ( e.key === 'Enter' && e.target.dataset.date ) e.target.click();
    });

    $('prev').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderMonth(); });
    $('next').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderMonth(); });
    $('today').addEventListener('click', () => {
        view = new Date();
        selected = todayKey();
        renderAll();
    });

    $('events').addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-act="delete"]');
        if ( !btn ) return;
        const id = btn.closest('[data-id]').dataset.id;
        if ( ! confirm('Delete this event?') ) return;
        await db.remove('events', id);
        events = events.filter((x) => x.id !== id);
        renderAll();
    });

    $('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        if ( ! selected ) return;
        const title = $('ev-title').value.trim();
        if ( ! title ) return say('Give the event a name.');
        const ev = {
            id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            date: selected,
            time: $('ev-time').value,
            title,
            note: $('ev-note').value.trim(),
        };
        await db.put('events', ev);
        events.push(ev);
        $('ev-title').value = '';
        $('ev-time').value = '';
        $('ev-note').value = '';
        say('');
        renderAll();
    });

    async function start () {
        events = await db.all('events');
        selected = todayKey();
        renderAll();
    }

    start();
})();
