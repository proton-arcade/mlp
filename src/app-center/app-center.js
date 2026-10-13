/*
 * App Manager (the App Store): lists the apps this account can use
 * (GET /apps/catalog), searches them, opens them, and uninstalls them by
 * revoking their permissions, the same way the Apps tab does.
 */
(function () {
    'use strict';

    const listEl = document.getElementById('apps');
    const statusEl = document.getElementById('status');
    const filterEl = document.getElementById('filter');
    const refreshBtn = document.getElementById('refresh');

    let apps = [];

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function setStatus (text) {
        statusEl.textContent = text || '';
    }

    // Built-in apps are served by this server, so the API lives on the `api.`
    // host of the page's own origin. The SDK's APIOrigin default is a public
    // host that does not serve this installation, so it is not used here.
    function apiOrigin () {
        return location.origin.replace('//', '//api.');
    }
    function authToken () {
        return (window.mixt && mixt.authToken) || localStorage.getItem('auth_token_v2') || '';
    }

    async function loadCatalog () {
        setStatus('Loading apps...');
        const resp = await fetch(`${apiOrigin()}/apps/catalog`, {
            headers: { Authorization: `Bearer ${authToken()}` },
            cache: 'no-store',
        });
        if ( ! resp.ok ) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
    }

    // Search: every word in the query must appear in the app's name, title or
    // description. Matches in the title rank first, then names, then text.
    function searchApps (list, query) {
        const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if ( terms.length === 0 ) return list;
        const scored = [];
        for ( const a of list ) {
            const title = String(a.title || '').toLowerCase();
            const name = String(a.name || '').toLowerCase();
            const desc = String(a.description || '').toLowerCase();
            const hay = `${title} ${name} ${desc}`;
            if ( ! terms.every((t) => hay.includes(t)) ) continue;
            let score = 0;
            for ( const t of terms ) {
                if ( title.includes(t) ) score += 3;
                else if ( name.includes(t) ) score += 2;
                else score += 1;
            }
            scored.push({ a, score });
        }
        scored.sort((x, y) => y.score - x.score ||
            String(x.a.title || x.a.name).localeCompare(String(y.a.title || y.a.name)));
        return scored.map((x) => x.a);
    }

    function render () {
        const q = filterEl.value;
        const shown = searchApps(apps, q);

        if ( shown.length === 0 ) {
            listEl.innerHTML = '';
            setStatus(apps.length === 0 ? 'No apps are available yet.' : `No apps match "${q.trim()}".`);
            return;
        }
        setStatus(`${shown.length} app${shown.length === 1 ? '' : 's'}`);
        listEl.innerHTML = shown.map((a) => `
            <li class="app" data-uid="${esc(a.uid)}" data-name="${esc(a.name)}">
                ${a.icon
                    ? `<img src="${esc(a.icon)}" alt="">`
                    : '<span class="fallback" aria-hidden="true"></span>'}
                <div class="text">
                    <div class="title">${esc(a.title || a.name)}</div>
                    <div class="desc">${esc(a.description)}</div>
                </div>
                <div class="actions">
                    <button class="btn primary" type="button" data-act="open">Open</button>
                    <button class="btn danger" type="button" data-act="uninstall">Uninstall</button>
                </div>
            </li>`).join('');
    }

    async function refresh () {
        refreshBtn.disabled = true;
        try {
            apps = await loadCatalog();
            render();
        } catch (err) {
            console.error('App Manager could not load the catalog:', err);
            listEl.innerHTML = '';
            setStatus('Could not load the app list. Check your connection and try Refresh.');
        } finally {
            refreshBtn.disabled = false;
        }
    }

    listEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-act]');
        if ( ! btn ) return;
        const row = btn.closest('.app');
        const name = row.dataset.name;
        const uid = row.dataset.uid;
        const label = row.querySelector('.title').textContent;

        if ( btn.dataset.act === 'open' ) {
            try {
                if ( window.mixt && mixt.ui && mixt.ui.launchApp ) {
                    await mixt.ui.launchApp(name);
                } else {
                    // Opened on its own: built-in apps live under /builtin/<name>/.
                    window.open(`/builtin/${encodeURIComponent(name)}/index.html`, '_blank', 'noopener');
                }
            } catch (err) {
                console.error(`Could not open ${name}:`, err);
                setStatus(`Could not open ${label}.`);
            }
            return;
        }

        if ( btn.dataset.act === 'uninstall' ) {
            if ( ! window.confirm(`Uninstall ${label}? This revokes its permissions.`) ) return;
            try {
                const resp = await fetch(`${apiOrigin()}/auth/revoke-user-app`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${authToken()}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ app_uid: uid, permission: '*' }),
                });
                if ( ! resp.ok ) throw new Error(`HTTP ${resp.status}`);
                apps = apps.filter((a) => a.uid !== uid);
                render();
                setStatus(`${label} was uninstalled.`);
            } catch (err) {
                console.error(`Could not uninstall ${name}:`, err);
                setStatus(`Could not uninstall ${label}.`);
            }
        }
    });

    filterEl.addEventListener('input', render);
    filterEl.addEventListener('keydown', (e) => {
        if ( e.key === 'Escape' && filterEl.value ) {
            e.preventDefault();
            filterEl.value = '';
            render();
        }
    });
    refreshBtn.addEventListener('click', refresh);
    refresh();
})();
