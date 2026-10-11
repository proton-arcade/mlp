/*
 * Equipment: an asset register. Each item has a service interval; the next
 * service date is worked out from the last service and shown with a flag
 * when it is due within 30 days or overdue.
 */
(function () {
    'use strict';

    const STATUS = [['in-service', 'In service'], ['repair', 'In repair'], ['storage', 'In storage'], ['retired', 'Retired']];
    const statusLabel = (id) => (STATUS.find((s) => s[0] === id) || [id, id])[1];

    function addDays (iso, n) {
        const d = new Date(iso + 'T00:00:00');
        d.setDate(d.getDate() + n);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function nextService (item) {
        if ( ! item.lastService || ! Number(item.intervalDays) ) return '';
        return addDays(item.lastService, Number(item.intervalDays));
    }

    function serviceFlag (item, today) {
        const next = nextService(item);
        if ( ! next || item.status === 'retired' ) return '';
        if ( next < today ) return 'bad';
        if (next <= addDays(today, 30)) return 'warn';
        return '';
    }

    const fields = [
        { key: 'name', label: 'Item', required: true, full: true },
        { key: 'serial', label: 'Serial or asset tag' },
        { key: 'category', label: 'Category' },
        { key: 'location', label: 'Location' },
        { key: 'assignedTo', label: 'Assigned to' },
        { key: 'status', label: 'Status', type: 'select', options: STATUS, default: 'in-service' },
        { key: 'purchased', label: 'Purchase date', type: 'date' },
        { key: 'cost', label: 'Purchase cost', type: 'number', min: 0, default: 0 },
        { key: 'lastService', label: 'Last serviced', type: 'date' },
        { key: 'intervalDays', label: 'Service every (days)', type: 'number', min: 0, default: 365 },
        { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 2 },
    ];

    Biz.app({
        title: 'Equipment',
        dbName: 'mixt-equipment',
        stores: ['items'],
        tabs: [
            {
                id: 'register',
                label: 'Register',
                async render (ctx, main) {
                    const items = await ctx.data('items');
                    const today = ctx.todayISO();
                    const filter = main.dataset.status || '';
                    const rows = items
                        .filter((i) => !filter || i.status === filter)
                        .map((i) => ({ ...i, _next: nextService(i), _cls: serviceFlag(i, today) }))
                        .sort((a, b) => a.name.localeCompare(b.name));
                    const active = items.filter((i) => i.status !== 'retired');
                    const due = active.filter((i) => serviceFlag(i, today) === 'bad' || serviceFlag(i, today) === 'warn');
                    const value = active.reduce((s, i) => s + (Number(i.cost) || 0), 0);
                    main.innerHTML = `
                        ${ctx.stats([
                            ['Items in use', String(active.length)],
                            ['Service due or overdue', String(due.length)],
                            ['In repair', String(items.filter((i) => i.status === 'repair').length)],
                            ['Original cost (active)', ctx.money(value)],
                        ])}
                        <div class="row">
                          <button class="btn primary" id="new" type="button">Add item</button>
                          <select id="filter" aria-label="Filter by status"><option value="">All statuses</option>${
                            STATUS.map(([v, l]) => `<option value="${v}" ${v === filter ? 'selected' : ''}>${l}</option>`).join('')
                          }</select>
                          <button class="btn" id="csv" type="button">Export CSV</button>
                        </div>
                        ${ctx.table([
                            { label: 'Item', key: 'name' },
                            { label: 'Serial', key: 'serial' },
                            { label: 'Location', key: 'location' },
                            { label: 'Assigned to', key: 'assignedTo' },
                            { label: 'Status', html: (r) => ctx.esc(statusLabel(r.status)) },
                            { label: 'Last service', html: (r) => ctx.esc(ctx.fmtDate(r.lastService)) },
                            { label: 'Next service', html: (r) => ctx.esc(ctx.fmtDate(r._next)) || '<span class="muted">—</span>' },
                        ], rows, { empty: 'No equipment yet.' })}`;
                    main.querySelector('#filter').onchange = (e) => { main.dataset.status = e.target.value; ctx.refresh(); };
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add item',
                        fields,
                        record: { lastService: today },
                        onSave: async (rec) => { await ctx.save('items', rec); ctx.toast('Item saved'); ctx.refresh(); },
                    });
                    main.querySelector('#csv').onclick = () => ctx.download('equipment.csv', ctx.toCsv([
                        { label: 'Item', key: 'name' }, { label: 'Serial', key: 'serial' },
                        { label: 'Category', key: 'category' }, { label: 'Location', key: 'location' },
                        { label: 'Assigned to', key: 'assignedTo' }, { label: 'Status', csv: (r) => statusLabel(r.status) },
                        { label: 'Last service', key: 'lastService' }, { label: 'Next service', csv: (r) => nextService(r) },
                    ], rows));
                    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit item',
                            fields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('items', r); ctx.toast('Item saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('items', r.id); ctx.toast('Item deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
        ],
    });
})();
