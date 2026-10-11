/*
 * Cap table: who owns what, by share class, plus a funding-round simulator.
 * The simulator prices a new round from a pre-money valuation and shows
 * how each holder's percentage changes after the new shares are issued.
 */
(function () {
    'use strict';

    const CLASSES = [['common', 'Common'], ['preferred', 'Preferred'], ['options', 'Options / pool']];
    const classLabel = (id) => (CLASSES.find((c) => c[0] === id) || [id, id])[1];

    const holderFields = [
        { key: 'name', label: 'Holder', required: true },
        { key: 'class', label: 'Share class', type: 'select', options: CLASSES, default: 'common' },
        { key: 'shares', label: 'Shares', type: 'number', required: true, min: 0, default: 0 },
        { key: 'price', label: 'Price paid per share', type: 'number', min: 0, default: 0, hint: 'Optional. Used only for the record.' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 2 },
    ];

    // Simulator state lives in memory while the tab is open.
    const sim = { preMoney: 8000000, raise: 2000000, poolTop: 0 };

    Biz.app({
        title: 'Cap Table',
        dbName: 'mixt-captable',
        stores: ['holders'],
        tabs: [
            {
                id: 'ownership',
                label: 'Ownership',
                async render (ctx, main) {
                    const holders = await ctx.data('holders');
                    const total = holders.reduce((s, h) => s + (Number(h.shares) || 0), 0);
                    const byClass = {};
                    for ( const h of holders ) byClass[h.class] = (byClass[h.class] || 0) + (Number(h.shares) || 0);
                    const rows = holders.map((h) => ({ ...h, _pct: total ? (Number(h.shares) || 0) / total : 0 }))
                        .sort((a, b) => b._pct - a._pct);
                    main.innerHTML = `
                        ${ctx.stats([
                            ['Fully diluted shares', ctx.number(total, 0)],
                            ['Holders', String(holders.length)],
                            ...CLASSES.filter((c) => byClass[c[0]]).map((c) => [c[1], ctx.number(byClass[c[0]], 0)]),
                        ])}
                        <div class="row"><button class="btn primary" id="new" type="button">Add holder</button></div>
                        ${ctx.table([
                            { label: 'Holder', key: 'name' },
                            { label: 'Class', html: (r) => ctx.esc(classLabel(r.class)) },
                            { label: 'Shares', align: 'right', fmt: (v) => ctx.number(v, 0) },
                            { label: 'Ownership', align: 'right', html: (r) => (r._pct * 100).toFixed(2) + '%' },
                        ], rows, { empty: 'No holders yet. Add founders, investors and the option pool.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add holder',
                        fields: holderFields,
                        onSave: async (rec) => { await ctx.save('holders', rec); ctx.toast('Holder saved'); ctx.refresh(); },
                    });
                    const byId = Object.fromEntries(holders.map((h) => [h.id, h]));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit holder',
                            fields: holderFields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('holders', r); ctx.toast('Holder saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('holders', r.id); ctx.toast('Holder removed'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'round',
                label: 'Round simulator',
                async render (ctx, main) {
                    const holders = await ctx.data('holders');
                    const before = holders.reduce((s, h) => s + (Number(h.shares) || 0), 0);
                    main.innerHTML = `
                        <div class="card"><h3>Inputs</h3>
                          <div class="grid2">
                            <label><span>Pre-money valuation</span><input id="pre" type="number" min="0" step="any" value="${sim.preMoney}"></label>
                            <label><span>New money raised</span><input id="raise" type="number" min="0" step="any" value="${sim.raise}"></label>
                            <label class="full"><span>Option pool top-up (shares, added before pricing)</span><input id="pool" type="number" min="0" step="any" value="${sim.poolTop}"></label>
                          </div></div>
                        <div id="out"></div>`;
                    const out = main.querySelector('#out');
                    const read = (id) => Number(main.querySelector(id).value) || 0;
                    const paint = () => {
                        sim.preMoney = read('#pre');
                        sim.raise = read('#raise');
                        sim.poolTop = read('#pool');
                        out.innerHTML = renderRound(ctx, holders, before, sim);
                    };
                    ['#pre', '#raise', '#pool'].forEach((id) => main.querySelector(id).addEventListener('input', paint));
                    paint();
                },
            },
        ],
    });

    function renderRound (ctx, holders, before, s) {
        const pool = s.poolTop;
        const fdPre = before + pool;                       // fully diluted before the new money
        if ( fdPre <= 0 || s.preMoney <= 0 ) {
            return '<div class="empty">Add holders and a pre-money valuation to see the round.</div>';
        }
        const price = s.preMoney / fdPre;                  // price per share
        const newShares = s.raise / price;
        const fdPost = fdPre + newShares;
        const postMoney = s.preMoney + s.raise;
        const rows = holders.map((h) => {
            const shares = Number(h.shares) || 0;
            return { id: h.id, name: h.name, cls: classLabel(h.class), now: shares / before, after: shares / fdPost };
        }).sort((a, b) => b.now - a.now);
        if ( pool > 0 ) rows.push({ id: 'pool', name: 'New option pool', cls: 'Options / pool', now: 0, after: pool / fdPost });
        rows.push({ id: 'new', name: 'New investors', cls: 'Preferred', now: 0, after: newShares / fdPost });
        return `
            ${ctx.stats([
                ['Price per share', ctx.money(price)],
                ['New shares issued', ctx.number(newShares, 0)],
                ['Post-money valuation', ctx.money(postMoney)],
                ['Fully diluted after', ctx.number(fdPost, 0)],
            ])}
            ${ctx.table([
                { label: 'Holder', key: 'name' },
                { label: 'Class', key: 'cls' },
                { label: 'Before', align: 'right', html: (r) => (r.now * 100).toFixed(2) + '%' },
                { label: 'After', align: 'right', html: (r) => (r.after * 100).toFixed(2) + '%' },
            ], rows, { empty: 'Nothing to show.' })}
            <p class="muted">Price per share = pre-money valuation ÷ fully diluted shares before the round (including any pool top-up). This is a planning estimate; check it with counsel before using it.</p>`;
    }
})();
