/*
 * CRM: contacts and a deal pipeline. Each stage has a default win chance,
 * so the pipeline shows open value, weighted value and won value.
 */
(function () {
    'use strict';

    const STAGES = [
        { id: 'lead', label: 'Lead', chance: 10 },
        { id: 'qualified', label: 'Qualified', chance: 30 },
        { id: 'proposal', label: 'Proposal', chance: 60 },
        { id: 'won', label: 'Won', chance: 100 },
        { id: 'lost', label: 'Lost', chance: 0 },
    ];
    const stageOf = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

    const contactFields = [
        { key: 'name', label: 'Name', required: true },
        { key: 'company', label: 'Company' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'phone', label: 'Phone', type: 'tel' },
        { key: 'lastContact', label: 'Last contact', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 3 },
    ];

    function dealFields (contacts) {
        return [
            { key: 'title', label: 'Deal name', required: true, full: true },
            { key: 'contactId', label: 'Contact', type: 'select',
              options: [['', 'None']].concat(contacts.map((c) => [c.id, c.name + (c.company ? ' (' + c.company + ')' : '')])) },
            { key: 'value', label: 'Value', type: 'number', default: 0, min: 0 },
            { key: 'stage', label: 'Stage', type: 'select', options: STAGES.map((s) => [s.id, s.label]), default: 'lead' },
            { key: 'closeDate', label: 'Expected close', type: 'date' },
            { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 3 },
        ];
    }

    Biz.app({
        title: 'CRM',
        dbName: 'mixt-crm',
        stores: ['contacts', 'deals'],
        tabs: [
            {
                id: 'pipeline',
                label: 'Pipeline',
                async render (ctx, main) {
                    const [contacts, deals] = await Promise.all([ctx.data('contacts'), ctx.data('deals')]);
                    const names = Object.fromEntries(contacts.map((c) => [c.id, c.name]));
                    const open = deals.filter((d) => stageOf(d.stage).id !== 'won' && stageOf(d.stage).id !== 'lost');
                    const sum = (arr) => arr.reduce((s, d) => s + (Number(d.value) || 0), 0);
                    const weighted = open.reduce((s, d) => s + (Number(d.value) || 0) * stageOf(d.stage).chance / 100, 0);
                    main.innerHTML = `
                        ${ctx.stats([
                            ['Open pipeline', ctx.money(sum(open))],
                            ['Weighted', ctx.money(weighted)],
                            ['Won', ctx.money(sum(deals.filter((d) => d.stage === 'won')))],
                            ['Open deals', String(open.length)],
                        ])}
                        <div class="row"><button class="btn primary" id="new" type="button">New deal</button></div>
                        <div class="board">${STAGES.map((st) => {
                            const inStage = deals.filter((d) => d.stage === st.id);
                            return `<div class="lane"><h3><span>${ctx.esc(st.label)}</span><span class="muted">${ctx.money(sum(inStage))}</span></h3>${
                                inStage.map((d) => `<div class="card" data-id="${ctx.esc(d.id)}"><strong>${ctx.esc(d.title)}</strong><div class="muted">${ctx.esc(names[d.contactId] || 'No contact')}</div><div>${ctx.money(d.value)}${d.closeDate ? ' · ' + ctx.esc(ctx.fmtDate(d.closeDate)) : ''}</div></div>`).join('') || '<div class="muted">No deals</div>'
                            }</div>`;
                        }).join('')}</div>`;
                    const byId = Object.fromEntries(deals.map((d) => [d.id, d]));
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New deal',
                        fields: dealFields(contacts),
                        onSave: async (rec) => { await ctx.save('deals', rec); ctx.toast('Deal saved'); ctx.refresh(); },
                    });
                    main.querySelectorAll('.lane .card').forEach((card) => card.onclick = () => {
                        const rec = byId[card.dataset.id];
                        ctx.form({
                            title: 'Edit deal',
                            fields: dealFields(contacts),
                            record: rec,
                            onSave: async (r) => { await ctx.save('deals', r); ctx.toast('Deal saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('deals', r.id); ctx.toast('Deal deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'contacts',
                label: 'Contacts',
                async render (ctx, main) {
                    const contacts = (await ctx.data('contacts')).sort((a, b) => a.name.localeCompare(b.name));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">New contact</button><button class="btn" id="csv" type="button">Export CSV</button></div>
                        ${ctx.table([
                            { label: 'Name', key: 'name' },
                            { label: 'Company', key: 'company' },
                            { label: 'Email', key: 'email' },
                            { label: 'Phone', key: 'phone' },
                            { label: 'Last contact', html: (r) => ctx.esc(ctx.fmtDate(r.lastContact)) },
                        ], contacts, { empty: 'No contacts yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New contact',
                        fields: contactFields,
                        onSave: async (rec) => { await ctx.save('contacts', rec); ctx.toast('Contact saved'); ctx.refresh(); },
                    });
                    main.querySelector('#csv').onclick = () => ctx.download('contacts.csv', ctx.toCsv([
                        { label: 'Name', key: 'name' }, { label: 'Company', key: 'company' },
                        { label: 'Email', key: 'email' }, { label: 'Phone', key: 'phone' },
                    ], contacts));
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = contacts.find((c) => c.id === tr.dataset.id);
                        ctx.form({
                            title: 'Edit contact',
                            fields: contactFields,
                            record: rec,
                            onSave: async (r) => { await ctx.save('contacts', r); ctx.toast('Contact saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('contacts', r.id); ctx.toast('Contact deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
        ],
    });
})();
