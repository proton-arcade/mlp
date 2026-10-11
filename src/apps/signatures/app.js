/*
 * Signatures: write a document, mark it ready for signing, draw a signature
 * on a pad, and download the signed copy as an HTML file. Everything stays
 * on this device.
 */
(function () {
    'use strict';

    const STATUS = { draft: 'Draft', pending: 'Awaiting signature', signed: 'Signed' };
    const badgeFor = { draft: '', pending: 'warn', signed: 'ok' };

    const docFields = [
        { key: 'title', label: 'Document title', required: true, full: true },
        { key: 'body', label: 'Text', type: 'textarea', full: true, rows: 10, required: true },
    ];

    function openSignPad (ctx, doc, onSigned) {
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 160;
        canvas.style.cssText = 'width:100%;max-width:500px;height:160px;border:1px solid #bbb;border-radius:6px;background:#fff;touch-action:none;cursor:crosshair';
        const ctx2 = canvas.getContext('2d');
        ctx2.lineWidth = 2.5;
        ctx2.lineCap = 'round';
        ctx2.strokeStyle = '#111';
        let drawing = false;
        let last = null;
        let inked = false;
        const pos = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
        };
        canvas.addEventListener('pointerdown', (e) => {
            drawing = true;
            canvas.setPointerCapture(e.pointerId);
            last = pos(e);
        });
        canvas.addEventListener('pointermove', (e) => {
            if ( ! drawing ) return;
            const p = pos(e);
            ctx2.beginPath();
            ctx2.moveTo(last.x, last.y);
            ctx2.lineTo(p.x, p.y);
            ctx2.stroke();
            last = p;
            inked = true;
        });
        const stop = () => { drawing = false; };
        canvas.addEventListener('pointerup', stop);
        canvas.addEventListener('pointercancel', stop);

        const wrap = document.createElement('div');
        wrap.className = 'card';
        wrap.innerHTML = `<h3>Sign here</h3>
            <label style="display:flex;flex-direction:column;gap:4px;max-width:500px"><span>Full name</span><input id="signer" type="text" value="${ctx.esc(doc.signerName || '')}" required></label>
            <p class="muted">Draw your signature with the mouse or your finger.</p>`;
        wrap.appendChild(canvas);
        const row = document.createElement('div');
        row.className = 'row';
        row.style.marginTop = '10px';
        row.innerHTML = `<button class="btn" type="button" id="clear">Clear</button><span class="grow"></span><button class="btn primary" type="button" id="sign">Sign and save</button>`;
        wrap.appendChild(row);
        row.querySelector('#clear').onclick = () => { ctx2.clearRect(0, 0, canvas.width, canvas.height); inked = false; };
        row.querySelector('#sign').onclick = async () => {
            const name = wrap.querySelector('#signer').value.trim();
            if ( ! name ) { ctx.toast('Type your full name'); return; }
            if ( ! inked ) { ctx.toast('Draw your signature first'); return; }
            await onSigned({ signerName: name, signature: canvas.toDataURL('image/png'), signedAt: Date.now() });
        };
        return wrap;
    }

    function signedHtml (ctx, doc) {
        const when = new Date(doc.signedAt).toLocaleString();
        return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${ctx.esc(doc.title)}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#111;line-height:1.5}
.sig{margin-top:40px;border-top:1px solid #999;padding-top:10px}.sig img{max-width:360px;height:auto}
.body{white-space:pre-wrap}</style></head><body>
<h1>${ctx.esc(doc.title)}</h1><div class="body">${ctx.esc(doc.body)}</div>
<div class="sig"><img src="${doc.signature}" alt="Signature of ${ctx.esc(doc.signerName)}"><div>${ctx.esc(doc.signerName)}</div><div>Signed ${ctx.esc(when)}</div></div>
</body></html>`;
    }

    Biz.app({
        title: 'Signatures',
        dbName: 'mixt-signatures',
        stores: ['documents'],
        tabs: [
            {
                id: 'documents',
                label: 'Documents',
                async render (ctx, main) {
                    const docs = await ctx.data('documents');
                    const openId = main.dataset.doc;
                    const doc = openId && docs.find((d) => d.id === openId);
                    if ( doc ) return renderDoc(ctx, main, doc);
                    delete main.dataset.doc;

                    const rows = docs.slice().sort((a, b) => b.updated - a.updated);
                    main.innerHTML = `<div class="row"><button class="btn primary" id="new" type="button">New document</button></div>
                        ${ctx.table([
                            { label: 'Title', key: 'title' },
                            { label: 'Status', html: (r) => `<span class="badge ${badgeFor[r.status] || ''}">${ctx.esc(STATUS[r.status] || 'Draft')}</span>` },
                            { label: 'Signed by', key: 'signerName' },
                            { label: 'Signed on', html: (r) => (r.signedAt ? ctx.esc(new Date(r.signedAt).toLocaleDateString()) : '') },
                        ], rows, { empty: 'No documents yet.' })}`;
                    main.querySelector('#new').onclick = () => ctx.form({
                        title: 'New document',
                        fields: docFields,
                        onSave: async (rec) => { const saved = await ctx.save('documents', { status: 'draft', ...rec }); main.dataset.doc = saved.id; ctx.toast('Document saved'); ctx.refresh(); },
                    });
                    main.querySelectorAll('tbody tr[data-id]').forEach((tr) => tr.onclick = () => {
                        main.dataset.doc = tr.dataset.id;
                        ctx.refresh();
                    });
                },
            },
        ],
    });

    function renderDoc (ctx, main, doc) {
        const signed = doc.status === 'signed';
        main.innerHTML = `<div class="row"><button class="btn" id="back" type="button">‹ All documents</button><span class="grow"></span>
            <button class="btn" id="edit" type="button" ${signed ? 'disabled title="Signed documents cannot be changed"' : ''}>Edit text</button>
            <button class="btn danger" id="del" type="button">Delete</button></div>
            <div class="sheet"><h2 style="margin-top:0">${ctx.esc(doc.title)}</h2>
              <p><span class="badge ${badgeFor[doc.status] || ''}">${ctx.esc(STATUS[doc.status] || 'Draft')}</span></p>
              <div style="white-space:pre-wrap;line-height:1.5">${ctx.esc(doc.body)}</div>
              <div id="sigarea" style="margin-top:20px"></div>
            </div>`;
        main.querySelector('#back').onclick = () => { delete main.dataset.doc; ctx.refresh(); };
        main.querySelector('#edit').onclick = () => ctx.form({
            title: 'Edit document',
            fields: docFields,
            record: doc,
            onSave: async (r) => { await ctx.save('documents', r); ctx.toast('Document saved'); ctx.refresh(); },
        });
        main.querySelector('#del').onclick = async () => {
            if ( ! window.confirm('Delete this document?') ) return;
            await ctx.remove('documents', doc.id);
            delete main.dataset.doc;
            ctx.toast('Document deleted');
            ctx.refresh();
        };
        const area = main.querySelector('#sigarea');
        if ( signed ) {
            area.innerHTML = `<div class="card"><h3>Signed by ${ctx.esc(doc.signerName)}</h3>
                <img src="${doc.signature}" alt="Signature" style="max-width:360px;background:#fff;border-radius:6px">
                <div class="muted">${ctx.esc(new Date(doc.signedAt).toLocaleString())}</div>
                <div class="row" style="margin-top:10px"><button class="btn" id="dl" type="button">Download signed copy (HTML)</button></div></div>`;
            area.querySelector('#dl').onclick = () => ctx.download(doc.title + ' (signed).html', signedHtml(ctx, doc), 'text/html');
        } else if ( doc.status === 'pending' ) {
            area.appendChild(openSignPad(ctx, doc, async (sig) => {
                await ctx.save('documents', { ...doc, ...sig, status: 'signed' });
                ctx.toast('Signed and saved');
                ctx.refresh();
            }));
        } else {
            area.innerHTML = `<div class="card"><p>This document is a draft. When the text is final, mark it ready so it can be signed.</p>
                <button class="btn primary" id="ready" type="button">Ready for signature</button></div>`;
            area.querySelector('#ready').onclick = async () => {
                await ctx.save('documents', { ...doc, status: 'pending' });
                ctx.toast('Ready for signature');
                ctx.refresh();
            };
        }
    }
})();
