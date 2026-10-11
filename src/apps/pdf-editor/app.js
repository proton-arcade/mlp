/*
 * PDF Editor: open a PDF from this computer, add text, highlights and white-out
 * boxes, then save a new PDF. Rendering uses pdf.js and saving uses pdf-lib
 * (both permissive, see vendor/NOTICE.txt). Nothing is uploaded.
 *
 * Marks are stored as fractions of the page size, so they stay in place when
 * the zoom changes. Saving draws them onto a copy of the original file.
 */
import * as pdfjsLib from './vendor/pdf.min.mjs';
import { PDFDocument, rgb, StandardFonts } from './vendor/pdf-lib.esm.min.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).href;

const $ = (id) => document.getElementById(id);
const viewer = $('viewer');
const statusEl = $('status');

let originalBytes = null;   // untouched copy of the file, used for saving
let pdf = null;             // pdf.js document
let fileName = 'document.pdf';
let zoom = 1;
let tool = 'text';
let marks = [];             // { id, type, page, x, y, w, h, text }
let undoStack = [];
let selected = null;
let pageEls = [];
let currentPage = 1;
let drag = null;
let textEditor = null;
let renderToken = 0;

const PAGE_BASE = 1.2;      // scale used at 100% zoom

function toast (msg) {
    statusEl.textContent = msg;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { statusEl.textContent = ''; }, 3500);
}

function uid () { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

async function openFile (file) {
    if ( ! file ) return;
    const buf = await file.arrayBuffer();
    originalBytes = buf.slice(0);             // keep a copy: pdf.js may detach the buffer
    try {
        pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    } catch (err) {
        toast('That file could not be opened as a PDF.');
        console.error(err);
        return;
    }
    fileName = file.name;
    $('name').textContent = file.name;
    marks = []; undoStack = []; selected = null; currentPage = 1;
    $('save').disabled = false;
    $('empty').remove();
    await renderAll();
    toast(`Opened ${pdf.numPages} page${pdf.numPages === 1 ? '' : 's'}`);
}

async function renderAll () {
    const token = ++renderToken;
    viewer.querySelectorAll('.page').forEach((el) => el.remove());
    pageEls = [];
    const dpr = window.devicePixelRatio || 1;
    for ( let n = 1; n <= pdf.numPages; n++ ) {
        if ( token !== renderToken ) return;
        const page = await pdf.getPage(n);
        const vp = page.getViewport({ scale: PAGE_BASE * zoom });
        const wrap = document.createElement('div');
        wrap.className = 'page';
        wrap.dataset.page = n;
        wrap.style.width = vp.width + 'px';
        wrap.style.height = vp.height + 'px';
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = vp.width + 'px';
        canvas.style.height = vp.height + 'px';
        const layer = document.createElement('div');
        layer.className = 'layer';
        wrap.append(canvas, layer);
        viewer.appendChild(wrap);
        pageEls.push(wrap);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
        wrapLayer(layer, n);
    }
    $('zoom').textContent = Math.round(zoom * 100) + '%';
    drawMarks();
    updatePageNo();
}

function wrapLayer (layer, n) {
    layer.addEventListener('pointerdown', (e) => onPointerDown(e, n));
    layer.addEventListener('pointermove', onPointerMove);
    layer.addEventListener('pointerup', (e) => onPointerUp(e, n));
}

function pointIn (layer, e) {
    const r = layer.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
}

function onPointerDown (e, n) {
    if ( e.target.closest('.ann') ) return;   // clicking a mark selects it, handled below
    if ( e.target.closest('#textbox') ) return;  // typing in the open text box
    if ( textEditor ) { commitText(); }
    const layer = e.currentTarget;
    const p = pointIn(layer, e);
    selectMark(null);
    if ( tool === 'text' ) {
        openTextEditor(layer, n, p);
        return;
    }
    drag = { layer, page: n, x0: p.x, y0: p.y, x1: p.x, y1: p.y, draft: null };
    layer.setPointerCapture(e.pointerId);
    drag.draft = document.createElement('div');
    drag.draft.className = 'ann draft ' + (tool === 'highlight' ? 'hl' : 'wo');
    layer.appendChild(drag.draft);
}

function onPointerMove (e) {
    if ( ! drag ) return;
    const p = pointIn(drag.layer, e);
    drag.x1 = p.x; drag.y1 = p.y;
    placeRect(drag.draft, rectOf(drag));
}

function onPointerUp (e, n) {
    if ( ! drag ) return;
    const r = rectOf(drag);
    drag.draft.remove();
    const d = drag;
    drag = null;
    if ( r.w < 0.005 || r.h < 0.005 ) return;    // a click, not a drag
    addMark({ type: tool, page: d.page, ...r });
}

function rectOf (d) {
    const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
    return { x: clamp(x), y: clamp(y), w: clamp(Math.abs(d.x1 - d.x0)), h: clamp(Math.abs(d.y1 - d.y0)) };
}

const clamp = (v) => Math.max(0, Math.min(1, v));

function placeRect (el, r) {
    el.style.left = (r.x * 100) + '%';
    el.style.top = (r.y * 100) + '%';
    el.style.width = (r.w * 100) + '%';
    el.style.height = (r.h * 100) + '%';
}

function openTextEditor (layer, n, p) {
    const box = document.createElement('div');
    box.id = 'textbox';
    box.contentEditable = 'true';
    box.style.left = (p.x * 100) + '%';
    box.style.top = (p.y * 100) + '%';
    layer.appendChild(box);
    textEditor = { box, page: n, x: p.x, y: p.y, layer };
    setTimeout(() => box.focus(), 0);
    box.addEventListener('keydown', (e) => {
        if ( e.key === 'Enter' && ! e.shiftKey ) { e.preventDefault(); commitText(); }
        if ( e.key === 'Escape' ) { e.preventDefault(); cancelText(); }
    });
    box.addEventListener('blur', () => setTimeout(() => { if ( textEditor && textEditor.box === box ) commitText(); }, 0));
}

function commitText () {
    if ( ! textEditor ) return;
    const t = textEditor;
    textEditor = null;
    const text = t.box.innerText.replace(/\n+$/, '');
    t.box.remove();
    if ( ! text.trim() ) return;
    addMark({ type: 'text', page: t.page, x: t.x, y: t.y, w: 0, h: 0, text });
}

function cancelText () {
    if ( ! textEditor ) return;
    textEditor.box.remove();
    textEditor = null;
}

function addMark (m) {
    m.id = uid();
    marks.push(m);
    undoStack.push({ kind: 'add', id: m.id });
    $('undo').disabled = false;
    drawMarks();
}

function selectMark (id) {
    selected = id;
    drawMarks();
}

function drawMarks () {
    document.querySelectorAll('.layer .ann:not(.draft)').forEach((el) => el.remove());
    for ( const m of marks ) {
        const layer = pageEls[m.page - 1] && pageEls[m.page - 1].querySelector('.layer');
        if ( ! layer ) continue;
        const el = document.createElement('div');
        el.dataset.id = m.id;
        el.className = 'ann ' + (m.type === 'highlight' ? 'hl' : m.type === 'whiteout' ? 'wo' : 'tx') + (m.id === selected ? ' sel' : '');
        if ( m.type === 'text' ) {
            el.style.left = (m.x * 100) + '%';
            el.style.top = (m.y * 100) + '%';
            el.textContent = m.text;
        } else {
            placeRect(el, m);
        }
        el.addEventListener('pointerdown', (e) => { e.stopPropagation(); selectMark(m.id); });
        layer.appendChild(el);
    }
    $('delete').disabled = ! selected;
}

function deleteSelected () {
    if ( ! selected ) return;
    const m = marks.find((x) => x.id === selected);
    if ( ! m ) return;
    marks = marks.filter((x) => x.id !== selected);
    undoStack.push({ kind: 'delete', mark: m });
    selected = null;
    $('undo').disabled = false;
    drawMarks();
}

function undo () {
    const last = undoStack.pop();
    if ( last ) {
        if ( last.kind === 'add' ) marks = marks.filter((m) => m.id !== last.id);
        else marks.push(last.mark);
        if ( selected && ! marks.find((m) => m.id === selected) ) selected = null;
    }
    $('undo').disabled = ! undoStack.length;
    drawMarks();
}

function setTool (name) {
    tool = name;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === name)));
}

function updatePageNo () {
    if ( ! pdf ) { $('pageno').textContent = '–'; return; }
    $('pageno').textContent = `${currentPage} / ${pdf.numPages}`;
}

function goToPage (n) {
    if ( ! pdf ) return;
    currentPage = Math.max(1, Math.min(pdf.numPages, n));
    const el = pageEls[currentPage - 1];
    if ( el ) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    updatePageNo();
}

viewer.addEventListener('scroll', () => {
    if ( ! pageEls.length ) return;
    const mid = viewer.scrollTop + viewer.clientHeight / 3;
    let best = 1;
    pageEls.forEach((el, i) => { if ( el.offsetTop <= mid ) best = i + 1; });
    if ( best !== currentPage ) { currentPage = best; updatePageNo(); }
});

async function save () {
    if ( ! originalBytes ) return;
    const out = await PDFDocument.load(originalBytes.slice(0), { ignoreEncryption: true });
    const font = await out.embedFont(StandardFonts.Helvetica);
    const pages = out.getPages();
    let skipped = 0;
    for ( const m of marks ) {
        const page = pages[m.page - 1];
        if ( ! page ) continue;
        const { width: W, height: H } = page.getSize();
        if ( m.type === 'highlight' ) {
            page.drawRectangle({ x: m.x * W, y: H - (m.y + m.h) * H, width: m.w * W, height: m.h * H, color: rgb(1, 0.92, 0.23), opacity: 0.45 });
        } else if ( m.type === 'whiteout' ) {
            page.drawRectangle({ x: m.x * W, y: H - (m.y + m.h) * H, width: m.w * W, height: m.h * H, color: rgb(1, 1, 1) });
        } else {
            const size = 14;
            const lines = m.text.split('\n');
            try {
                lines.forEach((line, i) => {
                    page.drawText(line, { x: m.x * W, y: H - m.y * H - size - i * size * 1.2, size, font, color: rgb(0, 0, 0) });
                });
            } catch (err) {
                skipped++;     // Helvetica can only draw Latin characters
            }
        }
    }
    const bytes = await out.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName.replace(/\.pdf$/i, '') + ' (edited).pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(skipped ? `Saved. ${skipped} text mark(s) use characters the built-in font cannot draw, so they were left out.` : 'Saved');
}

// ---- wiring ----
document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
$('file').addEventListener('change', (e) => openFile(e.target.files[0]));
$('delete').addEventListener('click', deleteSelected);
$('undo').addEventListener('click', undo);
$('save').addEventListener('click', save);
$('prev').addEventListener('click', () => goToPage(currentPage - 1));
$('next').addEventListener('click', () => goToPage(currentPage + 1));
$('zoomin').addEventListener('click', () => { zoom = Math.min(3, zoom + 0.25); renderAll(); });
$('zoomout').addEventListener('click', () => { zoom = Math.max(0.5, zoom - 0.25); renderAll(); });
document.addEventListener('keydown', (e) => {
    if ( textEditor ) return;
    if ( (e.key === 'Delete' || e.key === 'Backspace') && selected && e.target === document.body ) { e.preventDefault(); deleteSelected(); }
    if ( (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' ) { e.preventDefault(); undo(); }
});
