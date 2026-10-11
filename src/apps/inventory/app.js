/*
 * Inventory: stock items with reorder levels, stock adjustments with a reason,
 * and a movement history. Items at or below their reorder level are flagged.
 */
(function () {
    'use strict';

    const itemFields = [
        { key: 'sku', label: 'SKU', required: true },
        { key: 'name', label: 'Item name', required: true },
        { key: 'location', label: 'Location (shelf, bin)' },
        { key: 'quantity', label: 'Quantity on hand', type: 'number', min: 0, default: 0 },
        { key: 'reorderLevel', label: 'Reorder when at or below', type: 'number', min: 0, default: 0 },
        { key: 'unitCost', label: 'Unit cost', type: 'number', min: 0, default: 0 },
        { key: 'supplier', label: 'Supplier' },
    ];

    const isLow = (i) => (Number(i.quantity) || 0) <= (Number(i.reorderLevel) || 0);

    function adjustFields (items) {
        return [
            { key: 'itemId', label: 'Item', type: 'select', required: true,
              options: [['', 'Choose an item']].concat(items.map((i) => [i.id, i.sku + ' — ' + i.name])) },
            { key: 'change', label: 'Change (use − to take stock out)', type: 'number', required: true, step: '1', default: 1 },
            { key: 'reason', label: 'Reason', type: 'select', default: 'received',
              options: ['received', 'sold or used', 'damaged', 'counted (stock check)', 'other'] },
            { key: 'note', label: 'Note', full: true },
        ];
    }

    Biz.app({
        title: 'Inventory',
        dbName: 'mixt-inventory',
        stores: ['items', 'moves'],
        tabs: [
            {
                id: 'items',
                label: 'Items',
                async render (ctx, main) {
                    const items = (await ctx.data('items')).sort((a, b) => a.sku.localeCompare(b.sku));
                    const value = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);
                    const rows = items.map((i) => ({ ...i, _low: isLow(i), _value: (Number(i.quantity) || 0) * (Number(i.unitCost) || 0) }));
                    main.innerHTML = `
                        ${ctx.stats([
                            ['Items', String(items.length)],
                            ['Stock value', ctx.money(value)],
                            ['Low stock', String(rows.filter((r) => r._low).length)],
                        ])}
                        <div class="row"><button class="btn primary" id="new" type="button">Add item</button><button class="btn" id="adjust" type="button" ${items.length ? '' : 'disabled'}>Adjust stock</button><button class="btn" id="csv" type="button">Export CSV</button></div>
                        ${ctx.table([
                            { label: 'SKU', key: 'sku' },
                            { label: 'Item', key: 'name' },
                            { label: 'Location', key: 'location' },
                            { label: 'On hand', align: 'right', html: (r) => `${r._low ? '<span class="badge warn">Low</span> ' : ''}${ctx.number(r.quantity, 2)}` },
                            { label: 'Reorder at', align: 'right', fmt: (v) => ctx.number(v, 2), key: 'reorderLevel' },
                            { label: 'Unit cost', align: 'right', fmt: (v) => ctx.money(v), key: 'unitCost' },
                            { label: 'Value', align: 'right', fmt: (v) => ctx.money(v), key: '_value' },
                        ], rows.map((r) => ({ ...r, _cls: r._low ? 'warn' : '' })), { empty: 'No items yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add item',
                        fields: itemFields,
                        onSave: async (rec) => { await ctx.save('items', rec); ctx.toast('Item saved'); ctx.refresh(); },
                    });
                    main.querySelector('#adjust').onclick = () => openAdjust(ctx, items);
                    main.querySelector('#csv').onclick = () => ctx.download('inventory.csv', ctx.toCsv([
                        { label: 'SKU', key: 'sku' }, { label: 'Item', key: 'name' }, { label: 'Location', key: 'location' },
                        { label: 'On hand', key: 'quantity' }, { label: 'Reorder at', key: 'reorderLevel' },
                        { label: 'Unit cost', key: 'unitCost' }, { label: 'Value', csv: (r) => r._value.toFixed(2) },
                    ], rows));
                    const byId = Object.fromEntries(items.map((i) => [i.id, i]));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit item',
                            fields: itemFields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('items', r); ctx.toast('Item saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('items', r.id); ctx.toast('Item deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'history',
                label: 'Movements',
                async render (ctx, main) {
                    const [items, moves] = await Promise.all([ctx.data('items'), ctx.data('moves')]);
                    const names = Object.fromEntries(items.map((i) => [i.id, i.sku + ' ' + i.name]));
                    const rows = moves.slice().sort((a, b) => b.created - a.created).map((m) => ({
                        ...m, _when: new Date(m.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
                    }));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="adjust" type="button" ${items.length ? '' : 'disabled'}>Adjust stock</button></div>
                        ${ctx.table([
                            { label: 'When', key: '_when' },
                            { label: 'Item', html: (r) => ctx.esc(names[r.itemId] || 'Deleted item') },
                            { label: 'Change', align: 'right', html: (r) => (r.change > 0 ? '+' : '') + ctx.number(r.change, 2) },
                            { label: 'Reason', key: 'reason' },
                            { label: 'Note', key: 'note' },
                        ], rows, { empty: 'No stock changes yet.' })}`;
                    main.querySelector('#adjust').onclick = () => openAdjust(ctx, items);
                },
            },
            {
                id: 'low',
                label: 'Reorder list',
                async render (ctx, main) {
                    const items = (await ctx.data('items')).filter(isLow).sort((a, b) => a.sku.localeCompare(b.sku));
                    main.innerHTML = `<p class="muted">Items at or below their reorder level. Suggested order = the reorder level plus one, minus what is on hand.</p>
                        ${ctx.table([
                            { label: 'SKU', key: 'sku' },
                            { label: 'Item', key: 'name' },
                            { label: 'Supplier', key: 'supplier' },
                            { label: 'On hand', align: 'right', fmt: (v) => ctx.number(v, 2), key: 'quantity' },
                            { label: 'Suggested order', align: 'right', html: (r) => ctx.number(Math.max(1, (Number(r.reorderLevel) || 0) + 1 - (Number(r.quantity) || 0)), 0) },
                        ], items, { empty: 'Nothing is low right now.' })}`;
                },
            },
        ],
    });

    function openAdjust (ctx, items) {
        ctx.form({
            title: 'Adjust stock',
            fields: adjustFields(items),
            onSave: async (rec) => {
                const item = items.find((i) => i.id === rec.itemId);
                if ( ! item ) { ctx.toast('Choose an item'); return; }
                const change = Number(rec.change) || 0;
                if ( change === 0 ) { ctx.toast('The change cannot be zero'); return; }
                const next = (Number(item.quantity) || 0) + change;
                if ( next < 0 ) { ctx.toast('That would leave a negative stock count'); return; }
                await ctx.save('items', { ...item, quantity: next });
                await ctx.save('moves', { itemId: item.id, change, reason: rec.reason, note: rec.note || '', created: Date.now() });
                ctx.toast(`${item.name}: now ${next}`);
                ctx.refresh();
            },
        });
    }
})();
