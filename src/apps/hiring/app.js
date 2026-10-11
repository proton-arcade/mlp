/*
 * Hiring: open roles and a candidate pipeline. Candidates move through
 * stages from Applied to Hired; each has a 1–5 rating and interview notes.
 */
(function () {
    'use strict';

    const STAGES = [
        ['applied', 'Applied'], ['interview', 'Interview'], ['offer', 'Offer'], ['hired', 'Hired'], ['rejected', 'Rejected'],
    ];
    const RATING = [['0', 'Not rated'], ['1', '1 – weak'], ['2', '2'], ['3', '3 – good'], ['4', '4'], ['5', '5 – excellent']];

    const roleFields = [
        { key: 'title', label: 'Role title', required: true, full: true },
        { key: 'department', label: 'Department' },
        { key: 'status', label: 'Status', type: 'select', options: [['open', 'Open'], ['closed', 'Closed']], default: 'open' },
        { key: 'description', label: 'Description', type: 'textarea', full: true, rows: 3 },
    ];

    function candidateFields (roles) {
        return [
            { key: 'name', label: 'Candidate', required: true },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'phone', label: 'Phone', type: 'tel' },
            { key: 'roleId', label: 'Role', type: 'select', options: [['', 'No role']].concat(roles.map((r) => [r.id, r.title])) },
            { key: 'stage', label: 'Stage', type: 'select', options: STAGES, default: 'applied' },
            { key: 'rating', label: 'Rating', type: 'select', options: RATING, default: '0' },
            { key: 'appliedOn', label: 'Applied on', type: 'date' },
            { key: 'notes', label: 'Interview notes', type: 'textarea', full: true, rows: 4 },
        ];
    }

    Biz.app({
        title: 'Hiring',
        dbName: 'mixt-hiring',
        stores: ['roles', 'candidates'],
        tabs: [
            {
                id: 'pipeline',
                label: 'Pipeline',
                async render (ctx, main) {
                    const [roles, candidates] = await Promise.all([ctx.data('roles'), ctx.data('candidates')]);
                    const titles = Object.fromEntries(roles.map((r) => [r.id, r.title]));
                    const active = candidates.filter((c) => c.stage !== 'hired' && c.stage !== 'rejected').length;
                    main.innerHTML = `
                        ${ctx.stats([
                            ['Active candidates', String(active)],
                            ['Open roles', String(roles.filter((r) => r.status === 'open').length)],
                            ['Offers out', String(candidates.filter((c) => c.stage === 'offer').length)],
                            ['Hired', String(candidates.filter((c) => c.stage === 'hired').length)],
                        ])}
                        <div class="row"><button class="btn primary" id="new" type="button">Add candidate</button></div>
                        <div class="board">${STAGES.map(([id, label]) => {
                            const inStage = candidates.filter((c) => c.stage === id)
                                .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
                            return `<div class="lane"><h3><span>${label}</span><span class="muted">${inStage.length}</span></h3>${
                                inStage.map((c) => `<div class="card" data-id="${ctx.esc(c.id)}"><strong>${ctx.esc(c.name)}</strong>
                                    <div class="muted">${ctx.esc(titles[c.roleId] || 'No role')}</div>
                                    <div>${Number(c.rating) ? '★'.repeat(Number(c.rating)) : '<span class="muted">not rated</span>'}</div></div>`).join('') || '<div class="muted">None</div>'
                            }</div>`;
                        }).join('')}</div>`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add candidate',
                        fields: candidateFields(roles),
                        record: { appliedOn: ctx.todayISO() },
                        onSave: async (rec) => { await ctx.save('candidates', rec); ctx.toast('Candidate saved'); ctx.refresh(); },
                    });
                    const byId = Object.fromEntries(candidates.map((c) => [c.id, c]));
                    main.querySelectorAll('.lane .card').forEach((card) => card.onclick = () => {
                        const rec = byId[card.dataset.id];
                        ctx.form({
                            title: 'Edit candidate',
                            fields: candidateFields(roles),
                            record: { ...rec, rating: String(rec.rating || 0) },
                            onSave: async (r) => { await ctx.save('candidates', { ...r, rating: Number(r.rating) || 0 }); ctx.toast('Candidate saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('candidates', r.id); ctx.toast('Candidate removed'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'roles',
                label: 'Roles',
                async render (ctx, main) {
                    const [roles, candidates] = await Promise.all([ctx.data('roles'), ctx.data('candidates')]);
                    const rows = roles.map((r) => ({ ...r, _n: candidates.filter((c) => c.roleId === r.id).length }))
                        .sort((a, b) => a.title.localeCompare(b.title));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">Add role</button></div>
                        ${ctx.table([
                            { label: 'Role', key: 'title' },
                            { label: 'Department', key: 'department' },
                            { label: 'Status', html: (r) => (r.status === 'open' ? '<span class="badge ok">Open</span>' : '<span class="badge">Closed</span>') },
                            { label: 'Candidates', align: 'right', key: '_n' },
                        ], rows, { empty: 'No roles yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'Add role',
                        fields: roleFields,
                        onSave: async (rec) => { await ctx.save('roles', rec); ctx.toast('Role saved'); ctx.refresh(); },
                    });
                    const byId = Object.fromEntries(roles.map((r) => [r.id, r]));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = byId[tr.dataset.id];
                        ctx.form({
                            title: 'Edit role',
                            fields: roleFields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('roles', r); ctx.toast('Role saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('roles', r.id); ctx.toast('Role deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
        ],
    });
})();
