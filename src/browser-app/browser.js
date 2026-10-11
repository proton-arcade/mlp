/*
 * Browser app for Mixt. Mixt is fully offline, so this browser only opens the
 * sites stored in the internet folder and searches them with MPLmit.
 *
 *   - Sites are read from /builtin/internet/index.json (built from the folders
 *     in internet/ by tools/buildInternet.mjs).
 *   - A site is loaded as srcdoc in a sandboxed frame with a Content-Security-
 *     Policy that only allows this origin, so it cannot reach outside websites
 *     even if its own code tries.
 *   - Typing a web address (http://, https://, or a domain name) shows a
 *     "blocked offline" page instead of loading anything.
 */
(() => {
    'use strict';

    const INDEX_URL = '/builtin/internet/index.json';
    const SITE_BASE = '/builtin/internet/';
    const ORIGIN = window.location.origin;

    const view = document.getElementById('view');
    const address = document.getElementById('address');
    const addressForm = document.getElementById('address-form');
    const backBtn = document.getElementById('back');
    const forwardBtn = document.getElementById('forward');
    const reloadBtn = document.getElementById('reload');
    const homeBtn = document.getElementById('home');

    const state = {
        sites: [],
        history: [{ kind: 'home' }],
        pos: 0,
    };

    const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    // Content-Security-Policy for every site. Only this origin may serve
    // scripts, styles, images, fonts and media. Connections, frames and forms
    // are limited to this origin or blocked.
    const siteCsp = () => [
        "default-src 'none'",
        `script-src ${ORIGIN} 'unsafe-inline' 'unsafe-eval'`,
        `style-src ${ORIGIN} 'unsafe-inline'`,
        `img-src ${ORIGIN} data: blob:`,
        `font-src ${ORIGIN} data:`,
        `media-src ${ORIGIN} data: blob:`,
        `connect-src ${ORIGIN}`,
        "frame-src 'none'",
        "object-src 'none'",
        "form-action 'none'",
        `base-uri ${ORIGIN}`,
    ].join('; ');

    const loadIndex = async () => {
        try {
            const resp = await fetch(`${INDEX_URL}?t=${Date.now()}`, { cache: 'no-store' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            state.sites = Array.isArray(data.sites) ? data.sites : [];
        } catch (err) {
            console.error('[browser] could not read the internet index:', err);
            state.sites = [];
        }
    };

    // ---------------------------------------------------------------- MPLmit

    const tokenize = (text) => String(text).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

    const scoreSite = (site, terms) => {
        const title = site.title.toLowerCase();
        const description = (site.description || '').toLowerCase();
        const keywords = (site.keywords || []).map((k) => k.toLowerCase());
        const text = (site.text || '').toLowerCase();
        let score = 0;
        for (const term of terms) {
            if (title.includes(term)) score += 5;
            if (keywords.some((k) => k.includes(term))) score += 3;
            if (description.includes(term)) score += 2;
            if (text.includes(term)) score += 1;
        }
        return score;
    };

    const searchSites = (query) => {
        const terms = tokenize(query);
        if (terms.length === 0) return [];
        return state.sites
            .map((site) => ({ site, score: scoreSite(site, terms) }))
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score || a.site.title.localeCompare(b.site.title))
            .map((r) => r.site);
    };

    // Decides what an address-bar entry means.
    const interpret = (raw) => {
        const text = raw.trim();
        if (!text) return { kind: 'home' };
        const id = text.replace(/^internet:\/\//i, '').replace(/\/+$/, '');
        if (state.sites.some((s) => s.id === id)) return { kind: 'site', id };
        const looksExternal = /^[a-z][a-z0-9+.-]*:/i.test(text) || text.startsWith('//')
            || (/\./.test(text) && !/\s/.test(text));
        if (looksExternal) return { kind: 'blocked', target: text };
        return { kind: 'search', query: text };
    };

    // ------------------------------------------------------------- rendering

    const renderHome = () => {
        address.value = '';
        const cards = state.sites.length === 0
            ? '<p class="empty">No sites are stored yet. Add a folder with an index.html file to the internet folder, then restart Mixt.</p>'
            : `<div class="site-grid">${state.sites.map((s) => `
                <div class="site-card" role="button" tabindex="0" data-site="${esc(s.id)}">
                    <h3>${esc(s.title)}</h3>
                    <p>${esc(s.description || s.id)}</p>
                </div>`).join('')}</div>`;
        view.innerHTML = `
            <div class="mplmit-home">
                <h1 class="mplmit-logo">MPLmit</h1>
                <p class="mplmit-tagline">Search the pages stored on this computer</p>
                <form class="mplmit-search" id="home-search">
                    <input id="home-query" type="text" placeholder="Search MPLmit" aria-label="Search MPLmit" autocomplete="off">
                    <button type="submit">Search</button>
                </form>
                ${cards}
            </div>`;
        document.getElementById('home-search').addEventListener('submit', (e) => {
            e.preventDefault();
            navigate({ kind: 'search', query: document.getElementById('home-query').value });
        });
    };

    const renderSearch = (query) => {
        address.value = query;
        const results = searchSites(query);
        const items = results.length === 0
            ? `<p class="empty">No MPLmit results for &ldquo;${esc(query)}&rdquo;.</p>`
            : results.map((s) => `
                <div class="result" role="button" tabindex="0" data-site="${esc(s.id)}">
                    <h3>${esc(s.title)}</h3>
                    <p>${esc(s.description || '')}</p>
                    <div class="result-url">internet://${esc(s.id)}</div>
                </div>`).join('');
        view.innerHTML = `
            <div class="results">
                <h2>${results.length} result${results.length === 1 ? '' : 's'} for &ldquo;${esc(query)}&rdquo;</h2>
                ${items}
            </div>`;
    };

    const renderBlocked = (target) => {
        address.value = target;
        view.innerHTML = `
            <div class="notice">
                <h2>This address is blocked</h2>
                <p>Mixt runs fully offline, so outside websites cannot be opened. <strong>${esc(target)}</strong> was not loaded.</p>
                <p>Search MPLmit for the topic instead, or open one of the stored sites.</p>
                <button class="button-link" type="button" data-action="home">Go to MPLmit</button>
            </div>`;
    };

    const renderSite = async (id) => {
        const site = state.sites.find((s) => s.id === id);
        if (!site) {
            view.innerHTML = `<div class="notice"><h2>Page not found</h2><p>No stored site is called &ldquo;${esc(id)}&rdquo;.</p></div>`;
            return;
        }
        address.value = `internet://${site.id}`;
        view.innerHTML = '<p class="empty">Loading&hellip;</p>';
        let html;
        try {
            const resp = await fetch(site.url, { cache: 'no-store' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            html = await resp.text();
        } catch (err) {
            view.innerHTML = `<div class="notice"><h2>Could not open this page</h2><p>${esc(err.message)}</p></div>`;
            return;
        }
        const head = `<meta http-equiv="Content-Security-Policy" content="${esc(siteCsp())}"><base href="${esc(ORIGIN + SITE_BASE + encodeURIComponent(site.id) + '/')}">`;
        const doc = /<head[^>]*>/i.test(html)
            ? html.replace(/<head[^>]*>/i, (m) => `${m}${head}`)
            : `<head>${head}</head>${html}`;
        const frame = document.createElement('iframe');
        frame.className = 'site-frame';
        frame.title = site.title;
        // No allow-same-origin: the site cannot read this browser or Mixt.
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.srcdoc = doc;
        view.innerHTML = '';
        view.appendChild(frame);
    };

    // ------------------------------------------------------------ navigation

    const render = async (entry) => {
        if (entry.kind === 'home') renderHome();
        else if (entry.kind === 'search') renderSearch(entry.query);
        else if (entry.kind === 'blocked') renderBlocked(entry.target);
        else if (entry.kind === 'site') await renderSite(entry.id);
        updateButtons();
    };

    const updateButtons = () => {
        backBtn.disabled = state.pos <= 0;
        forwardBtn.disabled = state.pos >= state.history.length - 1;
    };

    // Moves to an entry. Adds it to history unless we are going back or forward.
    const navigate = (entry, { record = true } = {}) => {
        if (record) {
            state.history = state.history.slice(0, state.pos + 1);
            state.history.push(entry);
            state.pos = state.history.length - 1;
        }
        render(entry);
    };

    const goToAddress = (raw) => {
        const entry = interpret(raw);
        navigate(entry);
    };

    addressForm.addEventListener('submit', (e) => {
        e.preventDefault();
        goToAddress(address.value);
    });

    backBtn.addEventListener('click', () => {
        if (state.pos <= 0) return;
        state.pos -= 1;
        render(state.history[state.pos]);
        updateButtons();
    });

    forwardBtn.addEventListener('click', () => {
        if (state.pos >= state.history.length - 1) return;
        state.pos += 1;
        render(state.history[state.pos]);
        updateButtons();
    });

    reloadBtn.addEventListener('click', () => {
        loadIndex().then(() => render(state.history[state.pos]));
    });

    homeBtn.addEventListener('click', () => navigate({ kind: 'home' }));

    // Site cards and search results, and the blocked page's button.
    view.addEventListener('click', (e) => {
        const card = e.target.closest('[data-site]');
        if (card) {
            navigate({ kind: 'site', id: card.dataset.site });
            return;
        }
        if (e.target.closest('[data-action="home"]')) navigate({ kind: 'home' });
    });

    view.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const card = e.target.closest && e.target.closest('[data-site]');
        if (card) navigate({ kind: 'site', id: card.dataset.site });
    });

    loadIndex().then(() => render(state.history[state.pos]));
    address.focus();
})();
