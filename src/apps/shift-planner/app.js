/*
 * Shift planner: a weekly grid of staff by day. Shows hours per person and
 * warns when someone is scheduled past their weekly limit.
 */
(function () {
    'use strict';

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const staffFields = [
        { key: 'name', label: 'Name', required: true },
        { key: 'role', label: 'Role' },
        { key: 'maxHours', label: 'Max hours per week', type: 'number', min: 0, default: 40 },
        { key: 'phone', label: 'Phone', type: 'tel' },
    ];

    function shiftFields (staff) {
        return [
            { key: 'staffId', label: 'Person', type: 'select', required: true,
              options: [['', 'Choose someone']].concat(staff.map((s) => [s.id, s.name])) },
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'start', label: 'Start', type: 'time', required: true, default: '09:00' },
            { key: 'end', label: 'End', type: 'time', required: true, default: '17:00' },
            { key: 'place', label: 'Place or station' },
            { key: 'notes', label: 'Notes', full: true },
        ];
    }

    const minutes = (t) => {
        const [h, m] = String(t || '0:0').split(':').map(Number);
        return h * 60 + (m || 0);
    };
    const clock = (t) => t || '';
    const shiftHours = (s) => Math.max(0, minutes(s.end) - minutes(s.start)) / 60;

    function dayLabel (iso) {
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    Biz.app({
        title: 'Shift Planner',
        dbName: 'mixt-shifts',
        stores: ['staff', 'shifts'],
        tabs: [
            {
                id: 'week',
                label: 'Week',
                async render (ctx, main) {
                    const [staff, shifts] = await Promise.all([ctx.data('staff'), ctx.data('shifts')]);
                    const start = main.dataset.week || ctx.weekStart(ctx.todayISO());
                    main.dataset.week = start;
                    const days = DAYS.map((_, i) => ctx.addDays(start, i));
                    const weekEnd = days[6];
                    const inWeek = shifts.filter((s) => s.date >= start && s.date <= weekEnd);
                    const sorted = staff.slice().sort((a, b) => a.name.localeCompare(b.name));
                    const rows = sorted.map((p) => {
                        const mine = inWeek.filter((s) => s.staffId === p.id);
                        const hours = mine.reduce((s, x) => s + shiftHours(x), 0);
                        const over = hours > (Number(p.maxHours) || 0) && Number(p.maxHours) > 0;
                        return `<tr class="${over ? 'bad' : ''}">
                            <th style="text-align:left;position:sticky;left:0;background:inherit">${ctx.esc(p.name)}<div class="muted" style="font-weight:400">${ctx.esc(p.role || '')}</div></th>
                            ${days.map((d) => {
                                const cell = mine.filter((s) => s.date === d).sort((a, b) => minutes(a.start) - minutes(b.start));
                                return `<td class="cell" data-staff="${ctx.esc(p.id)}" data-date="${d}">${cell.map((s) =>
                                    `<div class="card" data-shift="${ctx.esc(s.id)}" style="padding:6px 8px;margin:0 0 4px;cursor:pointer">${clock(s.start)}–${clock(s.end)}${s.place ? '<div class="muted">' + ctx.esc(s.place) + '</div>' : ''}</div>`).join('')
                                }<button class="btn add" type="button" style="padding:2px 8px">+</button></td>`;
                            }).join('')}
                            <td class="r"><strong>${hours.toFixed(1)}</strong>${over ? ` <span class="badge bad">over ${Number(p.maxHours)}h</span>` : (p.maxHours ? ` <span class="muted">/ ${Number(p.maxHours)}</span>` : '')}</td>
                        </tr>`;
                    }).join('');
                    main.innerHTML = `
                        <div class="row">
                          <button class="btn" id="prev" type="button">‹ Previous week</button>
                          <strong>${dayLabel(start)} – ${dayLabel(weekEnd)}</strong>
                          <button class="btn" id="next" type="button">Next week ›</button>
                          <button class="btn" id="today" type="button">This week</button>
                          <span class="grow"></span>
                          <button class="btn primary" id="new" type="button" ${staff.length ? '' : 'disabled title="Add someone on the People tab first"'}>Add shift</button>
                        </div>
                        ${staff.length ? `<div class="tablewrap"><table class="biz" style="min-width:900px">
                            <thead><tr><th>Person</th>${days.map((d, i) => `<th>${DAYS[i]} ${dayLabel(d)}</th>`).join('')}<th class="r">Hours</th></tr></thead>
                            <tbody>${rows}</tbody></table></div>`
                            : '<div class="empty">Add people on the People tab, then plan shifts here.</div>'}`;
                    const move = (weeks) => { main.dataset.week = ctx.addDays(start, weeks * 7); ctx.refresh(); };
                    main.querySelector('#prev').onclick = () => move(-1);
                    main.querySelector('#next').onclick = () => move(1);
                    main.querySelector('#today').onclick = () => { delete main.dataset.week; ctx.refresh(); };
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add shift',
                        fields: shiftFields(staff),
                        record: { date: days[0] },
                        onSave: async (rec) => { await saveShift(ctx, rec, shifts); ctx.refresh(); },
                    });
                    main.querySelectorAll('.cell .add').forEach((btn) => btn.onclick = () => {
                        const td = btn.closest('td');
                        ctx.form({
                            title: 'Add shift',
                            fields: shiftFields(staff),
                            record: { staffId: td.dataset.staff, date: td.dataset.date },
                            onSave: async (rec) => { await saveShift(ctx, rec, shifts); ctx.refresh(); },
                        });
                    });
                    main.querySelectorAll('[data-shift]').forEach((card) => card.onclick = () => {
                        const rec = shifts.find((s) => s.id === card.dataset.shift);
                        ctx.form({
                            title: 'Edit shift',
                            fields: shiftFields(staff),
                            record: rec,
                            onSave: async (r) => { await saveShift(ctx, r, shifts); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('shifts', r.id); ctx.toast('Shift removed'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'people',
                label: 'People',
                async render (ctx, main) {
                    const staff = (await ctx.data('staff')).sort((a, b) => a.name.localeCompare(b.name));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">Add person</button></div>
                        ${ctx.table([
                            { label: 'Name', key: 'name' },
                            { label: 'Role', key: 'role' },
                            { label: 'Max hours / week', align: 'right', key: 'maxHours' },
                            { label: 'Phone', key: 'phone' },
                        ], staff, { empty: 'No one added yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add person',
                        fields: staffFields,
                        record: { maxHours: 40 },
                        onSave: async (rec) => { await ctx.save('staff', rec); ctx.toast('Saved'); ctx.refresh(); },
                    });
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = staff.find((s) => s.id === tr.dataset.id);
                        ctx.form({
                            title: 'Edit person',
                            fields: staffFields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('staff', r); ctx.toast('Saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('staff', r.id); ctx.toast('Removed'); ctx.refresh(); },
                        });
                    });
                },
            },
        ],
    });

    async function saveShift (ctx, rec) {
        if ( minutes(rec.end) <= minutes(rec.start) ) {
            ctx.toast('The end time must be after the start time');
            return;
        }
        await ctx.save('shifts', rec);
        ctx.toast('Shift saved');
    }
})();
