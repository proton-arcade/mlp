/*
 * Projects: a task board per project. Tasks move between To do, In progress
 * and Done, and each project shows how many of its tasks are finished.
 */
(function () {
    'use strict';

    const LANES = [['todo', 'To do'], ['doing', 'In progress'], ['done', 'Done']];
    const PRIORITY = [['low', 'Low'], ['normal', 'Normal'], ['high', 'High']];

    function projectFields () {
        return [
            { key: 'name', label: 'Project name', required: true, full: true },
            { key: 'due', label: 'Target date', type: 'date' },
            { key: 'description', label: 'Description', type: 'textarea', full: true, rows: 2 },
        ];
    }

    function taskFields (projects) {
        return [
            { key: 'title', label: 'Task', required: true, full: true },
            { key: 'projectId', label: 'Project', type: 'select', required: true,
              options: [['', 'Choose a project']].concat(projects.map((p) => [p.id, p.name])) },
            { key: 'status', label: 'Status', type: 'select', options: LANES, default: 'todo' },
            { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY, default: 'normal' },
            { key: 'assignee', label: 'Assignee' },
            { key: 'due', label: 'Due date', type: 'date' },
            { key: 'notes', label: 'Notes', type: 'textarea', full: true, rows: 3 },
        ];
    }

    Biz.app({
        title: 'Projects',
        dbName: 'mixt-projects',
        stores: ['projects', 'tasks'],
        tabs: [
            {
                id: 'board',
                label: 'Task board',
                async render (ctx, main) {
                    const [projects, tasks] = await Promise.all([ctx.data('projects'), ctx.data('tasks')]);
                    const names = Object.fromEntries(projects.map((p) => [p.id, p.name]));
                    const filter = main.dataset.project || '';
                    const shown = tasks.filter((t) => !filter || t.projectId === filter);
                    main.innerHTML = `
                        <div class="row">
                          <button class="btn primary" id="new" type="button" ${projects.length ? '' : 'disabled title="Add a project first"'}>New task</button>
                          <select id="filter" aria-label="Filter by project"><option value="">All projects</option>${
                            projects.map((p) => `<option value="${ctx.esc(p.id)}" ${p.id === filter ? 'selected' : ''}>${ctx.esc(p.name)}</option>`).join('')
                          }</select>
                          ${projects.length ? '' : '<span class="muted">Create a project on the Projects tab first.</span>'}
                        </div>
                        <div class="board">${LANES.map(([id, label]) => {
                            const cards = shown.filter((t) => t.status === id);
                            return `<div class="lane"><h3><span>${label}</span><span class="muted">${cards.length}</span></h3>${
                                cards.map((t) => `<div class="card" data-id="${ctx.esc(t.id)}">
                                    <strong>${ctx.esc(t.title)}</strong>
                                    <div class="muted">${ctx.esc(names[t.projectId] || 'No project')}${t.assignee ? ' · ' + ctx.esc(t.assignee) : ''}</div>
                                    <div>${t.priority === 'high' ? '<span class="badge bad">High</span> ' : ''}${t.due ? ctx.esc(ctx.fmtDate(t.due)) : ''}</div>
                                </div>`).join('') || '<div class="muted">Nothing here</div>'
                            }</div>`;
                        }).join('')}</div>`;
                    main.querySelector('#filter').onchange = (e) => { main.dataset.project = e.target.value; ctx.refresh(); };
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New task',
                        fields: taskFields(projects),
                        record: { projectId: filter },
                        onSave: async (rec) => { await ctx.save('tasks', rec); ctx.toast('Task saved'); ctx.refresh(); },
                    });
                    const byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
                    main.querySelectorAll('.lane .card').forEach((card) => card.onclick = () => {
                        const rec = byId[card.dataset.id];
                        ctx.form({
                            title: 'Edit task',
                            fields: taskFields(projects),
                            record: rec,
                            onSave: async (r) => { await ctx.save('tasks', r); ctx.toast('Task saved'); ctx.refresh(); },
                            onDelete: async (r) => { await ctx.remove('tasks', r.id); ctx.toast('Task deleted'); ctx.refresh(); },
                        });
                    });
                },
            },
            {
                id: 'projects',
                label: 'Projects',
                async render (ctx, main) {
                    const [projects, tasks] = await Promise.all([ctx.data('projects'), ctx.data('tasks')]);
                    const rows = projects.map((p) => {
                        const mine = tasks.filter((t) => t.projectId === p.id);
                        const done = mine.filter((t) => t.status === 'done').length;
                        return { ...p, _done: done, _total: mine.length, _pct: mine.length ? done / mine.length : 0 };
                    }).sort((a, b) => a.name.localeCompare(b.name));
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">New project</button></div>
                        ${ctx.table([
                            { label: 'Project', key: 'name' },
                            { label: 'Target', html: (r) => ctx.esc(ctx.fmtDate(r.due)) },
                            { label: 'Progress', html: (r) => `<div class="bar" style="width:160px"><span style="width:${(r._pct * 100).toFixed(0)}%"></span></div>` },
                            { label: 'Done', align: 'right', html: (r) => `${r._done} / ${r._total}` },
                        ], rows, { empty: 'No projects yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New project',
                        fields: projectFields(),
                        onSave: async (rec) => { await ctx.save('projects', rec); ctx.toast('Project saved'); ctx.refresh(); },
                    });
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        const rec = projects.find((p) => p.id === tr.dataset.id);
                        ctx.form({
                            title: 'Edit project',
                            fields: projectFields(),
                            record: rec,
                            onSave: async (r) => { await ctx.save('projects', r); ctx.toast('Project saved'); ctx.refresh(); },
                            onDelete: async (r) => {
                                await ctx.remove('projects', r.id);
                                for ( const t of tasks.filter((x) => x.projectId === r.id) ) await ctx.remove('tasks', t.id);
                                ctx.toast('Project and its tasks deleted');
                                ctx.refresh();
                            },
                        });
                    });
                },
            },
        ],
    });
})();
