/*
 * Point of sale: a register with a product grid, a cart, tax, cash tendered
 * and change. Completing a sale lowers stock on the product and writes a sale
 * record. Tax rate is kept on this device.
 */
(function () {
    'use strict';

    const TAX_KEY = 'mixt-pos-tax';
    const cart = new Map();     // productId -> qty, kept while the page is open

    const getTax = () => Number(localStorage.getItem(TAX_KEY) || 0) || 0;

    const productFields = [
        { key: 'name', label: 'Product', required: true, full: true },
        { key: 'sku', label: 'SKU or barcode' },
        { key: 'price', label: 'Price', type: 'number', required: true, min: 0, default: 0 },
        { key: 'stock', label: 'Stock on hand', type: 'number', min: 0, default: 0 },
        { key: 'category', label: 'Category' },
    ];

    Biz.app({
        title: 'Point of Sale',
        dbName: 'mixt-pos',
        stores: ['products', 'sales'],
        tabs: [
            {
                id: 'register',
                label: 'Register',
                async render (ctx, main) {
                    const products = (await ctx.data('products')).sort((a, b) => a.name.localeCompare(b.name));
                    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
                    for ( const id of [...cart.keys()] ) if ( ! byId[id] ) cart.delete(id);
                    const lines = [...cart.entries()].map(([id, qty]) => ({ p: byId[id], qty })).filter((l) => l.p);
                    const subtotal = lines.reduce((s, l) => s + l.qty * (Number(l.p.price) || 0), 0);
                    const tax = subtotal * getTax() / 100;
                    const total = subtotal + tax;
                    main.innerHTML = `
                        <div style="display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:14px;align-items:start">
                          <div>${products.length ? `<div class="board" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${products.map((p) => `
                              <button type="button" class="card prod" data-id="${ctx.esc(p.id)}" ${Number(p.stock) <= 0 ? 'disabled' : ''} style="text-align:left;cursor:pointer;font:inherit;color:inherit">
                                <strong>${ctx.esc(p.name)}</strong><div>${ctx.money(p.price)}</div>
                                <div class="muted">${Number(p.stock) > 0 ? ctx.number(p.stock, 0) + ' in stock' : 'Out of stock'}</div></button>`).join('')}</div>`
                            : '<div class="empty">Add products on the Products tab to start selling.</div>'}</div>
                          <div class="card">
                            <h3>Sale</h3>
                            ${lines.length ? lines.map((l) => `<div class="row" style="justify-content:space-between;margin:0 0 6px">
                                <span>${ctx.esc(l.p.name)}</span>
                                <span><button class="btn" data-dec="${ctx.esc(l.p.id)}" type="button">−</button> ${l.qty} <button class="btn" data-inc="${ctx.esc(l.p.id)}" type="button">+</button></span>
                                <span>${ctx.money(l.qty * l.p.price)}</span></div>`).join('') : '<p class="muted">Tap a product to add it.</p>'}
                            <hr>
                            <div class="row" style="justify-content:space-between"><span>Subtotal</span><span>${ctx.money(subtotal)}</span></div>
                            <div class="row" style="justify-content:space-between"><span>Tax (${getTax()}%)</span><span>${ctx.money(tax)}</span></div>
                            <div class="row" style="justify-content:space-between;font-size:18px"><strong>Total</strong><strong>${ctx.money(total)}</strong></div>
                            <label style="display:flex;flex-direction:column;gap:4px;margin-top:8px"><span>Cash tendered</span><input id="tendered" type="number" min="0" step="0.01"></label>
                            <div id="change" class="muted" style="margin:6px 0"></div>
                            <div class="row"><button class="btn primary" id="pay" type="button" ${lines.length ? '' : 'disabled'}>Complete sale</button><button class="btn" id="void" type="button" ${lines.length ? '' : 'disabled'}>Clear</button></div>
                            <div class="row" style="margin-top:10px"><label>Tax rate (%) <input id="taxrate" type="number" min="0" step="0.01" value="${getTax()}" style="width:90px"></label></div>
                          </div>
                        </div>`;
                    const refreshCart = () => ctx.refresh();
                    main.querySelectorAll('.prod').forEach((b) => b.onclick = () => {
                        const id = b.dataset.id;
                        const p = byId[id];
                        const inCart = cart.get(id) || 0;
                        if ( inCart + 1 > (Number(p.stock) || 0) ) { ctx.toast('Not enough stock for ' + p.name); return; }
                        cart.set(id, inCart + 1);
                        refreshCart();
                    });
                    main.querySelectorAll('[data-inc]').forEach((b) => b.onclick = () => {
                        const id = b.dataset.inc;
                        if ( (cart.get(id) || 0) + 1 > (Number(byId[id].stock) || 0) ) { ctx.toast('Not enough stock'); return; }
                        cart.set(id, (cart.get(id) || 0) + 1);
                        refreshCart();
                    });
                    main.querySelectorAll('[data-dec]').forEach((b) => b.onclick = () => {
                        const id = b.dataset.dec;
                        const q = (cart.get(id) || 0) - 1;
                        if ( q <= 0 ) cart.delete(id); else cart.set(id, q);
                        refreshCart();
                    });
                    const tendered = main.querySelector('#tendered');
                    tendered.oninput = () => {
                        const t = Number(tendered.value) || 0;
                        main.querySelector('#change').textContent = t >= total && lines.length ? 'Change due: ' + ctx.money(t - total) : (t > 0 ? 'Still owed: ' + ctx.money(total - t) : '');
                    };
                    main.querySelector('#taxrate').onchange = (e) => {
                        localStorage.setItem(TAX_KEY, String(Math.max(0, Number(e.target.value) || 0)));
                        refreshCart();
                    };
                    main.querySelector('#void').onclick = () => { cart.clear(); refreshCart(); };
                    main.querySelector('#pay').onclick = async () => {
                        const t = Number(tendered.value) || 0;
                        if ( t < total ) { ctx.toast('Cash tendered is less than the total'); return; }
                        const soldLines = lines.map((l) => ({ productId: l.p.id, name: l.p.name, price: Number(l.p.price) || 0, qty: l.qty }));
                        for ( const l of lines ) {
                            await ctx.save('products', { ...l.p, stock: (Number(l.p.stock) || 0) - l.qty });
                        }
                        await ctx.save('sales', {
                            lines: soldLines, subtotal, tax, total, tendered: t, change: t - total,
                            taxRate: getTax(), created: Date.now(),
                        });
                        cart.clear();
                        ctx.toast(`Sale complete. Change ${ctx.money(t - total)}`);
                        ctx.refresh();
                    };
                },
            },
            {
                id: 'products',
                label: 'Products',
                async render (ctx, main) {
                    const products = (await ctx.data('products')).sort((a, b) => a.name.localeCompare(b.name));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">Add product</button></div>
                        ${ctx.table([
                            { label: 'Product', key: 'name' },
                            { label: 'SKU', key: 'sku' },
                            { label: 'Category', key: 'category' },
                            { label: 'Price', align: 'right', fmt: (v) => ctx.money(v), key: 'price' },
                            { label: 'Stock', align: 'right', fmt: (v) => ctx.number(v, 0), key: 'stock' },
                        ], products, { empty: 'No products yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add product',
                        fields: productFields,
                        onSave: async (rec) => { await ctx.save('products', rec); ctx.toast('Product saved'); ctx.refresh(); },
                    });
                    const byId = Object.fromEntries(products.map((p) => [p.id, p]));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit product',
                            fields: productFields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('products', r); ctx.toast('Product saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('products', r.id); ctx.toast('Product deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'sales',
                label: 'Sales',
                async render (ctx, main) {
                    const sales = (await ctx.data('sales')).sort((a, b) => b.created - a.created);
                    const today = ctx.todayISO();
                    const isToday = (s) => ctx.todayISO(0, new Date(s.created)) === today;
                    const todays = sales.filter(isToday);
                    const sum = (arr, k) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0);
                    main.innerHTML = `
                        ${ctx.stats([
                            ['Sales today', String(todays.length)],
                            ['Takings today', ctx.money(sum(todays, 'total'))],
                            ['Tax today', ctx.money(sum(todays, 'tax'))],
                            ['All time', ctx.money(sum(sales, 'total'))],
                        ])}
                        <div class="row"><button class="btn" id="csv" type="button">Export CSV</button></div>
                        ${ctx.table([
                            { label: 'When', html: (r) => ctx.esc(new Date(r.created).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })) },
                            { label: 'Items', html: (r) => ctx.esc(r.lines.map((l) => l.qty + '× ' + l.name).join(', ')) },
                            { label: 'Total', align: 'right', fmt: (v) => ctx.money(v), key: 'total' },
                            { label: 'Paid cash', align: 'right', fmt: (v) => ctx.money(v), key: 'tendered' },
                            { label: 'Change', align: 'right', fmt: (v) => ctx.money(v), key: 'change' },
                        ], sales, { empty: 'No sales yet.' })}`;
                    main.querySelector('#csv').onclick = () => ctx.download('sales.csv', ctx.toCsv([
                        { label: 'When', csv: (r) => new Date(r.created).toISOString() },
                        { label: 'Items', csv: (r) => r.lines.map((l) => l.qty + 'x ' + l.name).join('; ') },
                        { label: 'Subtotal', csv: (r) => r.subtotal.toFixed(2) },
                        { label: 'Tax', csv: (r) => r.tax.toFixed(2) },
                        { label: 'Total', csv: (r) => r.total.toFixed(2) },
                    ], sales));
                },
            },
        ],
    });
})();
