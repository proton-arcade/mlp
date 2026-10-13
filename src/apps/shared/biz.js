/*
 * Shared base for the business apps (invoices, CRM, projects, and so on).
 * Records are kept on this device in IndexedDB through LocalDB. The page is a
 * header with tabs; each tab's render() fills the main area and wires its own
 * buttons. Original code.
 */
(function () {
    'use strict';

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    const uid = (prefix) => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    const money = (n, currency) => new Intl.NumberFormat(undefined, {
        style: 'currency', currency: currency || 'USD',
    }).format(Number(n) || 0);

    const number = (n, digits = 2) => (Number(n) || 0).toLocaleString(undefined, {
        maximumFractionDigits: digits,
    });

    // Local calendar date (YYYY-MM-DD), optionally offset by days or taken from a given Date.
    const todayISO = (offsetDays = 0, base) => {
        const d = new Date((base ? base.getTime() : Date.now()) + offsetDays * 86400000);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    };

    const fmtDate = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
    }) : '');

    // Monday of the week containing the ISO date.
    function weekStart (iso) {
        const d = new Date(iso + 'T00:00:00');
        const day = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - day);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function addDays (iso, n) {
        const d = new Date(iso + 'T00:00:00');
        d.setDate(d.getDate() + n);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function download (filename, text, type) {
        const blob = new Blob([text], { type: type || 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename.replace(/[\\/:*?"<>|]+/g, '_');
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    // columns: [{ key, label, align, fmt(value,row), html(row), csv(row) }]
    function toCsv (columns, rows) {
        const q = (v) => {
            const s = v == null ? '' : String(v);
            return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const head = columns.map((c) => q(c.label)).join(',');
        const body = rows.map((r) => columns.map((c) => q(c.csv ? c.csv(r) : (c.key ? r[c.key] : ''))).join(','));
        return [head, ...body].join('\r\n') + '\r\n';
    }

    function table (columns, rows, opts = {}) {
        if ( ! rows.length ) return `<div class="empty">${esc(opts.empty || 'Nothing here yet.')}</div>`;
        const head = columns.map((c) => `<th class="${c.align === 'right' ? 'r' : ''}">${esc(c.label)}</th>`).join('');
        const body = rows.map((r) => {
            const cells = columns.map((c) => {
                let inner;
                if ( c.html ) inner = c.html(r);
                else if ( c.fmt ) inner = esc(c.fmt(r[c.key], r));
                else inner = esc(r[c.key]);
                return `<td class="${c.align === 'right' ? 'r' : ''}">${inner}</td>`;
            }).join('');
            return `<tr data-id="${esc(r.id)}" class="${r._cls || ''}">${cells}</tr>`;
        }).join('');
        return `<div class="tablewrap"><table class="biz"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }

    function stats (items) {
        return '<div class="stats">' + items.map(([label, value]) =>
            `<div class="stat"><div class="sv">${esc(value)}</div><div class="sl">${esc(label)}</div></div>`).join('') + '</div>';
    }

    // Form dialog. fields: [{ key, label, type, options, required, full, placeholder, default, hint }]
    // type: text | number | date | email | tel | textarea | select | checkbox | color
    function fieldHtml (f, record) {
        const raw = record[f.key] ?? f.default ?? '';
        const id = 'f-' + f.key;
        const req = f.required ? ' required' : '';
        const cls = f.full ? ' class="full"' : '';
        const hint = f.hint ? `<small>${esc(f.hint)}</small>` : '';
        if ( f.type === 'checkbox' ) {
            return `<label${cls} class="check"><input id="${id}" type="checkbox" ${raw ? 'checked' : ''}> ${esc(f.label)}</label>`;
        }
        let control;
        if ( f.type === 'select' ) {
            const opts = (f.options || []).map((o) => {
                const [v, l] = Array.isArray(o) ? o : [o, o];
                return `<option value="${esc(v)}" ${String(v) === String(raw) ? 'selected' : ''}>${esc(l)}</option>`;
            }).join('');
            control = `<select id="${id}"${req}>${opts}</select>`;
        } else if ( f.type === 'textarea' ) {
            control = `<textarea id="${id}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}"${req}>${esc(raw)}</textarea>`;
        } else {
            const type = f.type || 'text';
            const step = type === 'number' ? ' step="' + (f.step || 'any') + '"' : '';
            const min = f.min != null ? ` min="${f.min}"` : '';
            control = `<input id="${id}" type="${type}" value="${esc(raw)}" placeholder="${esc(f.placeholder || '')}"${step}${min}${req}>`;
        }
        return `<label${cls}><span>${esc(f.label)}</span>${control}${hint}</label>`;
    }

    function openForm (opts) {
        const { title, fields, record = {}, onSave, onDelete } = opts;
        const dlg = document.createElement('dialog');
        dlg.className = 'biz-dialog';
        dlg.innerHTML = `<form class="biz-form"><h2>${esc(title)}</h2><div class="grid2">${
            fields.map((f) => fieldHtml(f, record)).join('')
        }</div><div class="actions">${
            onDelete ? '<button type="button" class="btn danger" data-del>Delete</button>' : ''
        }<span class="grow"></span><button type="button" class="btn" data-cancel>Cancel</button><button type="submit" class="btn primary">Save</button></div></form>`;
        document.body.appendChild(dlg);
        const formEl = dlg.querySelector('form');
        dlg.addEventListener('close', () => dlg.remove());
        dlg.querySelector('[data-cancel]').addEventListener('click', () => dlg.close());
        if ( onDelete ) {
            dlg.querySelector('[data-del]').addEventListener('click', () => {
                if ( ! window.confirm('Delete this record? This cannot be undone.') ) return;
                dlg.close();
                onDelete(record);
            });
        }
        formEl.addEventListener('submit', (e) => {
            e.preventDefault();
            if ( ! formEl.reportValidity() ) return;
            const values = {};
            for ( const f of fields ) {
                const el = dlg.querySelector('#f-' + f.key);
                if ( ! el ) continue;
                if ( f.type === 'checkbox' ) values[f.key] = el.checked;
                else if ( f.type === 'number' ) values[f.key] = el.value === '' ? 0 : Number(el.value);
                else values[f.key] = el.value;
            }
            dlg.close();
            onSave(Object.assign({}, record, values));
        });
        dlg.showModal();
        const first = dlg.querySelector('input:not([type=checkbox]), select, textarea');
        if ( first ) first.focus();
    }

    // Store wrapper over LocalDB. Writes stamp `updated`.
    function makeStore (dbName, stores) {
        const db = window.LocalDB(dbName, stores);
        return {
            all: (store) => db.all(store),
            async save (store, rec) {
                const r = Object.assign({}, rec);
                r.id = r.id || uid(store);
                r.updated = Date.now();
                await db.put(store, r);
                return r;
            },
            remove: (store, id) => db.remove(store, id),
        };
    }

    // Build the app page. config: { title, dbName, stores, tabs: [{ id, label, render(ctx, main) }] }
    function app (config) {
        const store = makeStore(config.dbName, config.stores);
        const root = document.getElementById('app');
        root.innerHTML = `<header class="toolbar"><h1>${esc(config.title)}</h1><nav class="tabs" id="tabs" role="tablist"></nav><span class="grow"></span><span id="status" class="status" role="status"></span></header><main id="main" class="main"></main>`;
        const tabsEl = document.getElementById('tabs');
        const main = document.getElementById('main');
        const statusEl = document.getElementById('status');
        let statusTimer = null;
        let current = config.tabs[0].id;

        const ctx = {
            esc, money, number, todayISO, fmtDate, uid, weekStart, addDays,
            table, stats, toCsv, download,
            data: (s) => store.all(s),
            save: (s, rec) => store.save(s, rec),
            remove: (s, id) => store.remove(s, id),
            form: openForm,
            toast (msg) {
                statusEl.textContent = msg;
                clearTimeout(statusTimer);
                statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 3500);
            },
            refresh: () => refresh(),
            tabId: () => current,
        };

        function renderTabs () {
            tabsEl.innerHTML = config.tabs.map((t) =>
                `<button type="button" class="tab" role="tab" data-tab="${esc(t.id)}" aria-selected="${t.id === current}">${esc(t.label)}</button>`).join('');
            tabsEl.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
                current = b.dataset.tab;
                renderTabs();
                refresh();
            }));
        }

        async function refresh () {
            const tab = config.tabs.find((t) => t.id === current);
            try {
                await tab.render(ctx, main);
            } catch (err) {
                main.innerHTML = `<div class="empty">Something went wrong: ${esc(err && err.message)}</div>`;
                console.error(err);
            }
        }

        renderTabs();
        refresh();
    }

    window.Biz = { app, esc, money, number, todayISO, fmtDate, uid, weekStart, addDays, table, stats, toCsv, download, openForm, makeStore };
})();
