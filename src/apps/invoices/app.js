/*
 * Invoices: customers and invoices with line items, tax, due dates and status.
 * Lines are typed one per row as "description, quantity, unit price".
 */
(function () {
    'use strict';

    const STATUS = [['draft', 'Draft'], ['sent', 'Sent'], ['paid', 'Paid']];

    function parseLines (text) {
        return String(text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
            const parts = line.split(',');
            const price = Number(parts.pop()) || 0;
            const qty = Number(parts.pop()) || 0;
            return { description: parts.join(',').trim() || 'Item', qty, price };
        });
    }

    function totals (inv) {
        const lines = parseLines(inv.lines);
        const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
        const tax = subtotal * (Number(inv.taxRate) || 0) / 100;
        return { subtotal, tax, total: subtotal + tax };
    }

    function effectiveStatus (inv, today) {
        if ( inv.status === 'sent' && inv.due && inv.due < today ) return 'overdue';
        return inv.status || 'draft';
    }

    function badge (status) {
        const cls = status === 'paid' ? 'ok' : status === 'overdue' ? 'bad' : status === 'sent' ? 'warn' : '';
        const label = status.charAt(0).toUpperCase() + status.slice(1);
        return `<span class="badge ${cls}">${label}</span>`;
    }

    function nextNumber (invoices) {
        const max = invoices.reduce((m, i) => {
            const n = parseInt(String(i.number || '').replace(/\D/g, ''), 10);
            return Number.isFinite(n) && n > m ? n : m;
        }, 0);
        return 'INV-' + String(max + 1).padStart(4, '0');
    }

    function invoiceFields (customers) {
        return [
            { key: 'number', label: 'Invoice number', required: true },
            { key: 'customerId', label: 'Customer', type: 'select', required: true,
              options: [['', 'Choose a customer']].concat(customers.map((c) => [c.id, c.name])) },
            { key: 'issued', label: 'Issue date', type: 'date', required: true },
            { key: 'due', label: 'Due date', type: 'date', required: true },
            { key: 'status', label: 'Status', type: 'select', options: STATUS, default: 'draft' },
            { key: 'taxRate', label: 'Tax rate (%)', type: 'number', default: 0, min: 0 },
            { key: 'lines', label: 'Line items', type: 'textarea', full: true, rows: 5,
              placeholder: 'Website design, 10, 85\nHosting (monthly), 12, 15',
              hint: 'One per line: description, quantity, unit price. Commas inside the description are fine; the last two values are the quantity and price.' },
            { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 2 },
        ];
    }

    const customerFields = [
        { key: 'name', label: 'Name', required: true, full: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'address', label: 'Address', type: 'textarea', full: true, rows: 2 },
    ];

    Biz.app({
        title: 'Invoices',
        dbName: 'mixt-invoices',
        stores: ['customers', 'invoices'],
        tabs: [
            {
                id: 'invoices',
                label: 'Invoices',
                async render (ctx, main) {
                    const [customers, invoices] = await Promise.all([ctx.data('customers'), ctx.data('invoices')]);
                    const names = Object.fromEntries(customers.map((c) => [c.id, c.name]));
                    const today = ctx.todayISO();
                    const rows = invoices.map((i) => ({ ...i, _t: totals(i), _s: effectiveStatus(i, today) }))
                        .sort((a, b) => String(b.number).localeCompare(String(a.number)));
                    const open = rows.filter((r) => r._s === 'sent' || r._s === 'overdue');
                    const sum = (arr) => arr.reduce((s, r) => s + r._t.total, 0);
                    main.innerHTML = `
                        ${ctx.stats([
                            ['Outstanding', ctx.money(sum(open))],
                            ['Paid', ctx.money(sum(rows.filter((r) => r._s === 'paid')))],
                            ['Overdue', String(rows.filter((r) => r._s === 'overdue').length)],
                            ['Drafts', String(rows.filter((r) => r._s === 'draft').length)],
                        ])}
                        <div class="row"><button class="btn primary" id="new" type="button" ${customers.length ? '' : 'disabled title="Add a customer first"'}>New invoice</button>
                        <button class="btn" id="csv" type="button">Export CSV</button>
                        ${customers.length ? '' : '<span class="muted">Add a customer on the Customers tab first.</span>'}</div>
                        ${ctx.table([
                            { label: 'Number', key: 'number' },
                            { label: 'Customer', html: (r) => ctx.esc(names[r.customerId] || '—') },
                            { label: 'Issued', html: (r) => ctx.esc(ctx.fmtDate(r.issued)) },
                            { label: 'Due', html: (r) => ctx.esc(ctx.fmtDate(r.due)) },
                            { label: 'Total', align: 'right', html: (r) => ctx.money(r._t.total) },
                            { label: 'Status', html: (r) => badge(r._s) },
                        ], rows, { empty: 'No invoices yet.' })}`;
                    const byId = Object.fromEntries(invoices.map((i) => [i.id, i]));
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New invoice',
                        fields: invoiceFields(customers),
                        record: { number: nextNumber(invoices), issued: ctx.todayISO(), due: ctx.todayISO(30) },
                        onSave: async (rec) => { await ctx.save('invoices', rec); ctx.toast('Invoice saved'); ctx.refresh(); },
                    });
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit invoice ' + rec.number,
                            fields: invoiceFields(customers),
                            record: rec,
                            onSave: async (r) => { await ctx.save('invoices', r); ctx.toast('Invoice saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('invoices', r.id); ctx.toast('Invoice deleted'); ctx.refresh(); },
                        });
                    });
                    main.querySelector('#csv').onclick = () => ctx.download('invoices.csv', ctx.toCsv([
                        { label: 'Number', key: 'number' },
                        { label: 'Customer', csv: (r) => names[r.customerId] || '' },
                        { label: 'Issued', key: 'issued' },
                        { label: 'Due', key: 'due' },
                        { label: 'Subtotal', csv: (r) => r._t.subtotal.toFixed(2) },
                        { label: 'Tax', csv: (r) => r._t.tax.toFixed(2) },
                        { label: 'Total', csv: (r) => r._t.total.toFixed(2) },
                        { label: 'Status', csv: (r) => r._s },
                    ], rows));
                },
            },
            {
                id: 'customers',
                label: 'Customers',
                async render (ctx, main) {
                    const customers = (await ctx.data('customers')).sort((a, b) => a.name.localeCompare(b.name));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">New customer</button></div>
                        ${ctx.table([
                            { label: 'Name', key: 'name' },
                            { label: 'Email', key: 'email' },
                            { label: 'Phone', key: 'phone' },
                        ], customers, { empty: 'No customers yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New customer',
                        fields: customerFields,
                        onSave: async (rec) => { await ctx.save('customers', rec); ctx.toast('Customer saved'); ctx.refresh(); },
                    });
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = customers.find((c) => c.id === tr.dataset.id);
                        ctx.form({
                            title: 'Edit customer',
                            fields: customerFields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('customers', r); ctx.toast('Customer saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('customers', r.id); ctx.toast('Customer deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
        ],
    });
})();
