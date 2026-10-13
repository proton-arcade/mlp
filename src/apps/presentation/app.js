/*
 * Presentation: decks of slides, saved on this device. Edit a slide's title
 * and text on the left, preview it on the right, and use Present to step
 * through the deck full screen with the arrow keys.
 */
(function () {
    'use strict';

    const THEMES = [['light', 'Light'], ['dark', 'Dark'], ['green', 'Green'], ['blue', 'Blue']];
    const THEME_COLORS = {
        light: ['#ffffff', '#1f2326'], dark: ['#1f2326', '#f2f2f0'], green: ['#23402a', '#f1f8ea'], blue: ['#1d3557', '#f1f5fb'],
    };

    let current = null;      // selected deck id
    let slideIndex = 0;

    Biz.app({
        title: 'Presentation',
        dbName: 'mixt-presentation',
        stores: ['decks'],
        tabs: [
            {
                id: 'editor',
                label: 'Slides',
                async render (ctx, main) {
                    const decks = (await ctx.data('decks')).sort((a, b) => a.name.localeCompare(b.name));
                    if ( ! decks.length ) {
                        main.innerHTML = `<div class="empty">No presentations yet.</div>
                            <div class="row" style="justify-content:center;margin-top:12px"><button class="btn primary" id="newdeck" type="button">New presentation</button></div>`;
                        main.querySelector('#newdeck').onclick = () => newDeck(ctx);
                        return;
                    }
                    let deck = decks.find((d) => d.id === current) || decks[0];
                    current = deck.id;
                    if ( ! deck.slides.length ) deck.slides = [{ title: 'Untitled slide', body: '', theme: 'light' }];
                    if ( slideIndex >= deck.slides.length ) slideIndex = deck.slides.length - 1;
                    const slide = deck.slides[slideIndex];

                    main.innerHTML = `
                        <div class="row">
                          <select id="deck" aria-label="Presentation">${decks.map((d) => `<option value="${ctx.esc(d.id)}" ${d.id === deck.id ? 'selected' : ''}>${ctx.esc(d.name)}</option>`).join('')}</select>
                          <button class="btn" id="newdeck" type="button">New</button>
                          <button class="btn" id="renamedeck" type="button">Rename</button>
                          <button class="btn danger" id="deldeck" type="button">Delete</button>
                          <span class="grow"></span>
                          <button class="btn" id="export" type="button">Export HTML</button>
                          <button class="btn primary" id="present" type="button">Present</button>
                        </div>
                        <div style="display:grid;grid-template-columns:200px minmax(0,1fr);gap:14px;align-items:start">
                          <div>
                            ${deck.slides.map((s, i) => `<button type="button" class="card slide-thumb" data-i="${i}" style="display:block;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;${i === slideIndex ? 'border-color:#4a8f2e;background:#f1f8ea' : ''}"><span class="muted">${i + 1}.</span> ${ctx.esc(s.title || 'Untitled')}</button>`).join('')}
                            <div class="row"><button class="btn" id="addslide" type="button">+ Slide</button><button class="btn" id="dupslide" type="button">Duplicate</button><button class="btn danger" id="delslide" type="button" ${deck.slides.length < 2 ? 'disabled' : ''}>Delete</button></div>
                          </div>
                          <div>
                            <div class="card" style="padding:0;overflow:hidden">${slideHtml(ctx, slide, 'preview')}</div>
                            <div class="card" style="margin-top:12px">
                              <label style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"><span>Title</span><input id="stitle" type="text" value="${ctx.esc(slide.title)}"></label>
                              <label style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px"><span>Text (one bullet per line)</span><textarea id="sbody" rows="6">${ctx.esc(slide.body)}</textarea></label>
                              <label style="display:flex;flex-direction:column;gap:4px"><span>Theme</span><select id="stheme">${THEMES.map(([v, l]) => `<option value="${v}" ${(slide.theme || 'light') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
                            </div>
                          </div>
                        </div>`;

                    const save = async () => {
                        deck.updated = Date.now();
                        await ctx.save('decks', deck);
                        ctx.toast('Saved');
                    };
                    const pickSlide = (i) => { slideIndex = i; ctx.refresh(); };
                    main.querySelector('#deck').onchange = (e) => { current = e.target.value; slideIndex = 0; ctx.refresh(); };
                    main.querySelector('#newdeck').onclick = () => newDeck(ctx);
                    main.querySelector('#renamedeck').onclick = async () => {
                        const name = window.prompt('Rename presentation', deck.name);
                        if ( name && name.trim() ) { deck.name = name.trim(); await save(); ctx.refresh(); }
                    };
                    main.querySelector('#deldeck').onclick = async () => {
                        if ( ! window.confirm(`Delete "${deck.name}"?`) ) return;
                        await ctx.remove('decks', deck.id);
                        current = null; slideIndex = 0;
                        ctx.refresh();
                    };
                    main.querySelectorAll('.slide-thumb').forEach((b) => b.onclick = () => pickSlide(Number(b.dataset.i)));
                    main.querySelector('#addslide').onclick = async () => {
                        deck.slides.splice(slideIndex + 1, 0, { title: 'New slide', body: '', theme: slide.theme || 'light' });
                        slideIndex += 1;
                        await save(); ctx.refresh();
                    };
                    main.querySelector('#dupslide').onclick = async () => {
                        deck.slides.splice(slideIndex + 1, 0, { ...slide });
                        slideIndex += 1;
                        await save(); ctx.refresh();
                    };
                    main.querySelector('#delslide').onclick = async () => {
                        if ( deck.slides.length < 2 ) return;
                        deck.slides.splice(slideIndex, 1);
                        slideIndex = Math.max(0, slideIndex - 1);
                        await save(); ctx.refresh();
                    };
                    let timer = null;
                    const edit = (field, value) => {
                        slide[field] = value;
                        clearTimeout(timer);
                        timer = setTimeout(save, 400);
                    };
                    main.querySelector('#stitle').oninput = (e) => {
                        edit('title', e.target.value);
                        main.querySelector('.slide-thumb.active, .slide-thumb[data-i="' + slideIndex + '"]').innerHTML = `<span class="muted">${slideIndex + 1}.</span> ${ctx.esc(e.target.value || 'Untitled')}`;
                        main.querySelector('.card[style*="overflow"]').innerHTML = slideHtml(ctx, slide, 'preview');
                    };
                    main.querySelector('#sbody').oninput = (e) => {
                        edit('body', e.target.value);
                        main.querySelector('.card[style*="overflow"]').innerHTML = slideHtml(ctx, slide, 'preview');
                    };
                    main.querySelector('#stheme').onchange = (e) => { slide.theme = e.target.value; save().then(() => ctx.refresh()); };
                    main.querySelector('#present').onclick = () => present(ctx, deck, slideIndex);
                    main.querySelector('#export').onclick = () => ctx.download(deck.name + '.html', exportHtml(ctx, deck), 'text/html');
                },
            },
        ],
    });

    async function newDeck (ctx) {
        const name = window.prompt('Name for the new presentation', 'Untitled presentation');
        if ( ! name || ! name.trim() ) return;
        const deck = await ctx.save('decks', { name: name.trim(), slides: [{ title: name.trim(), body: 'Subtitle or date', theme: 'light' }] });
        current = deck.id;
        slideIndex = 0;
        ctx.refresh();
    }

    function bullets (body) {
        return String(body || '').split('\n').map((l) => l.trim()).filter(Boolean);
    }

    function slideHtml (ctx, slide, mode) {
        const [bg, fg] = THEME_COLORS[slide.theme || 'light'] || THEME_COLORS.light;
        const pad = mode === 'present' ? '6vh 8vw' : '28px 32px';
        const size = mode === 'present' ? 'min(5.2vw, 72px)' : '26px';
        const bsize = mode === 'present' ? 'min(3vw, 40px)' : '16px';
        const items = bullets(slide.body).map((b) => `<li>${ctx.esc(b)}</li>`).join('');
        return `<div style="background:${bg};color:${fg};min-height:${mode === 'present' ? '100%' : '260px'};padding:${pad};box-sizing:border-box;font-family:system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center">
            <h2 style="margin:0 0 16px;font-size:${size};line-height:1.15">${ctx.esc(slide.title)}</h2>
            <ul style="margin:0;padding-left:1.2em;font-size:${bsize};line-height:1.5">${items}</ul></div>`;
    }

    function present (ctx, deck, start) {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column';
        let i = start;
        const show = () => {
            overlay.innerHTML = `<div style="flex:1;min-height:0">${slideHtml(ctx, deck.slides[i], 'present')}</div>
                <div style="position:absolute;right:12px;bottom:10px;color:#aaa;font:13px system-ui;">${i + 1} / ${deck.slides.length} · ← → to move · Esc to exit</div>`;
            overlay.firstChild.style.height = '100%';
        };
        const key = (e) => {
            if ( e.key === 'Escape' ) { close(); }
            else if ( e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ' ) { i = Math.min(deck.slides.length - 1, i + 1); show(); }
            else if ( e.key === 'ArrowLeft' || e.key === 'PageUp' ) { i = Math.max(0, i - 1); show(); }
        };
        const close = () => { document.removeEventListener('keydown', key); overlay.remove(); };
        document.addEventListener('keydown', key);
        show();
        document.body.appendChild(overlay);
    }

    function exportHtml (ctx, deck) {
        const slides = deck.slides.map((s) => `<section style="page-break-after:always;height:100vh">${slideHtml(ctx, s, 'present')}</section>`).join('');
        return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${ctx.esc(deck.name)}</title></head><body style="margin:0">${slides}</body></html>`;
    }
})();
