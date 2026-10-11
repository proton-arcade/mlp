/*
 * Time tracking: a start/stop timer, manual entries, and totals per project
 * and per week. A running timer is saved as an entry with no end time, so it
 * keeps going across reloads.
 */
(function () {
    'use strict';

    let ticker = null;

    const pad = (n) => String(n).padStart(2, '0');
    const hms = (ms) => {
        const s = Math.max(0, Math.floor(ms / 1000));
        return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
    };
    const hours = (ms) => (ms / 3600000).toFixed(2);
    const localDate = (ms) => Biz.todayISO(0, new Date(ms));
    const localTime = (ms) => {
        const d = new Date(ms);
        return pad(d.getHours()) + ':' + pad(d.getMinutes());
    };
    const combine = (date, time) => new Date(date + 'T' + time + ':00').getTime();

    function entryMs (e) {
        return (e.end || Date.now()) - e.start;
    }

    function rateOf (projects, id) {
        const p = projects.find((x) => x.id === id);
        return p ? Number(p.rate) || 0 : 0;
    }

    function projectFields () {
        return [
            { key: 'name', label: 'Project or client', required: true, full: true },
            { key: 'rate', label: 'Hourly rate', type: 'number', min: 0, default: 0 },
            { key: 'billable', label: 'Billable', type: 'checkbox', default: true },
        ];
    }

    function entryFields (projects) {
        return [
            { key: 'projectId', label: 'Project', type: 'select',
              options: [['', 'No project']].concat(projects.map((p) => [p.id, p.name])) },
            { key: 'description', label: 'What did you work on?', full: true },
            { key: 'date', label: 'Date', type: 'date', required: true },
            { key: 'startTime', label: 'Start', type: 'time', required: true },
            { key: 'endTime', label: 'End (blank if still running)', type: 'time' },
        ];
    }

    Biz.app({
        title: 'Time Tracking',
        dbName: 'mixt-time',
        stores: ['projects', 'entries'],
        tabs: [
            {
                id: 'timer',
                label: 'Timer',
                async render (ctx, main) {
                    clearInterval(ticker);
                    const [projects, entries] = await Promise.all([ctx.data('projects'), ctx.data('entries')]);
                    const running = entries.find((e) => !e.end);
                    const today = localDate(Date.now());
                    const weekStart = ctx.weekStart(today);
                    const inWeek = (e) => localDate(e.start) >= weekStart;
                    const weekMs = entries.filter(inWeek).reduce((s, e) => s + entryMs(e), 0);
                    const weekMoney = entries.filter(inWeek).reduce((s, e) => s + entryMs(e) / 3600000 * rateOf(projects, e.projectId), 0);
                    const todayMs = entries.filter((e) => localDate(e.start) === today).reduce((s, e) => s + entryMs(e), 0);
                    main.innerHTML = `
                        <div class="card" style="max-width:560px">
                          <h3>${running ? 'Running' : 'Start a timer'}</h3>
                          <div class="grid2">
                            <label class="full"><span>Project</span><select id="proj" ${running ? 'disabled' : ''}><option value="">No project</option>${
                                projects.map((p) => `<option value="${ctx.esc(p.id)}" ${running && running.projectId === p.id ? 'selected' : ''}>${ctx.esc(p.name)}</option>`).join('')
                            }</select></label>
                            <label class="full"><span>What are you working on?</span><input id="desc" type="text" value="${ctx.esc(running ? running.description : '')}" ${running ? 'disabled' : ''}></label>
                          </div>
                          <div style="font-size:32px;font-variant-numeric:tabular-nums;margin:14px 0" id="clock">${running ? hms(Date.now() - running.start) : '00:00:00'}</div>
                          <button class="btn ${running ? 'danger' : 'primary'}" id="toggle" type="button">${running ? 'Stop timer' : 'Start timer'}</button>
                        </div>
                        ${ctx.stats([
                            ['Today', hours(todayMs) + ' h'],
                            ['This week', hours(weekMs) + ' h'],
                            ['Billable this week', ctx.money(weekMoney)],
                        ])}`;
                    main.querySelector('#toggle').onclick = async () => {
                        if ( running ) {
                            await ctx.save('entries', { ...running, end: Date.now() });
                            ctx.toast('Time entry saved');
                        } else {
                            await ctx.save('entries', {
                                projectId: main.querySelector('#proj').value,
                                description: main.querySelector('#desc').value.trim(),
                                start: Date.now(),
                                end: null,
                            });
                            ctx.toast('Timer started');
                        }
                        ctx.refresh();
                    };
                    if ( running ) {
                        ticker = setInterval(() => {
                            const el = main.querySelector('#clock');
                            if ( el ) el.textContent = hms(Date.now() - running.start);
                            else clearInterval(ticker);
                        }, 1000);
                    }
                },
            },
            {
                id: 'entries',
                label: 'Entries',
                async render (ctx, main) {
                    clearInterval(ticker);
                    const [projects, entries] = await Promise.all([ctx.data('projects'), ctx.data('entries')]);
                    const names = Object.fromEntries(projects.map((p) => [p.id, p.name]));
                    const rows = entries.slice().sort((a, b) => b.start - a.start).map((e) => ({
                        ...e,
                        _date: localDate(e.start),
                        _dur: entryMs(e),
                        _amt: entryMs(e) / 3600000 * rateOf(projects, e.projectId),
                    }));
                    main.innerHTML = `<div class="row"><button class="btn" id="csv" type="button">Export CSV</button><button class="btn primary" id="new" type="button">Add entry</button></div>
                        ${ctx.table([
                            { label: 'Date', key: '_date' },
                            { label: 'Project', html: (r) => ctx.esc(names[r.projectId] || '—') },
                            { label: 'Description', key: 'description' },
                            { label: 'Time', html: (r) => `${localTime(r.start)} – ${r.end ? localTime(r.end) : 'running'}` },
                            { label: 'Hours', align: 'right', html: (r) => hours(r._dur) },
                            { label: 'Amount', align: 'right', html: (r) => ctx.money(r._amt) },
                        ], rows, { empty: 'No time entries yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add time entry',
                        fields: entryFields(projects),
                        record: { date: localDate(Date.now()), startTime: '09:00', endTime: '10:00' },
                        onSave: (rec) => saveEntry(ctx, rec),
                    });
                    main.querySelector('#csv').onclick = () => ctx.download('time-entries.csv', ctx.toCsv([
                        { label: 'Date', key: '_date' },
                        { label: 'Project', csv: (r) => names[r.projectId] || '' },
                        { label: 'Description', key: 'description' },
                        { label: 'Hours', csv: (r) => hours(r._dur) },
                        { label: 'Amount', csv: (r) => r._amt.toFixed(2) },
                    ], rows));
                    const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const e = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit time entry',
                            fields: entryFields(projects),
                            record: { ...e, date: localDate(e.start), startTime: localTime(e.start), endTime: e.end ? localTime(e.end) : '' },
                            onSave: (rec) => saveEntry(ctx, rec, e),
                            onDelete: async (r) => { await ctx.remove('entries', r.id); ctx.toast('Entry deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'projects',
                label: 'Projects',
                async render (ctx, main) {
                    clearInterval(ticker);
                    const [projects, entries] = await Promise.all([ctx.data('projects'), ctx.data('entries')]);
                    const rows = projects.map((p) => {
                        const ms = entries.filter((e) => e.projectId === p.id).reduce((s, e) => s + entryMs(e), 0);
                        return { ...p, _hours: ms / 3600000, _amt: p.billable ? ms / 3600000 * (Number(p.rate) || 0) : 0 };
                    }).sort((a, b) => a.name.localeCompare(b.name));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">New project</button></div>
                        ${ctx.table([
                            { label: 'Project', key: 'name' },
                            { label: 'Rate', align: 'right', fmt: (v) => ctx.money(v) },
                            { label: 'Billable', html: (r) => (r.billable ? 'Yes' : 'No') },
                            { label: 'Hours', align: 'right', html: (r) => r._hours.toFixed(2) },
                            { label: 'Billable amount', align: 'right', html: (r) => ctx.money(r._amt) },
                        ], rows, { empty: 'No projects yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New project',
                        fields: projectFields(),
                        record: { billable: true },
                        onSave: async (rec) => { await ctx.save('projects', rec); ctx.toast('Project saved'); ctx.refresh(); },
                    });
                    const byId = Object.fromEntries(projects.map((p) => [p.id, p]));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit project',
                            fields: projectFields(),
                            record: rec,
                            onSave: async (r) => { await ctx.save('projects', r); ctx.toast('Project saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('projects', r.id); ctx.toast('Project deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
        ],
    });

    async function saveEntry (ctx, rec, original) {
        const start = combine(rec.date, rec.startTime);
        const end = rec.endTime ? combine(rec.date, rec.endTime) : null;
        if ( end !== null && end <= start ) {
            ctx.toast('The end time must be after the start time');
            return;
        }
        await ctx.save('entries', {
            id: original ? original.id : undefined,
            projectId: rec.projectId || '',
            description: rec.description || '',
            start,
            end,
        });
        ctx.toast('Entry saved');
        ctx.refresh();
    }
})();
