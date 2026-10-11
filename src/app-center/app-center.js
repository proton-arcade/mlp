/*
 * App Center: the software manager for accounts. It lists the apps this
 * account can use (GET /apps/catalog), opens them, and uninstalls them by
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

    // Inside the desktop, mixt provides the API origin and token. Opened on its
    // own, the page uses the same token and the api. host beside the page.
    function apiOrigin () {
        return (window.mixt && mixt.APIOrigin) || location.origin.replace('//', '//api.');
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

    function render () {
        const q = filterEl.value.trim().toLowerCase();
        const shown = apps.filter((a) =>
            !q || String(a.title || a.name).toLowerCase().includes(q) ||
            String(a.description || '').toLowerCase().includes(q));

        if ( shown.length === 0 ) {
            listEl.innerHTML = '';
            setStatus(apps.length === 0 ? 'No apps are available yet.' : 'No apps match your filter.');
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
            console.error('App Center could not load the catalog:', err);
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
    refreshBtn.addEventListener('click', refresh);
    refresh();
})();
