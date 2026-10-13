/*
 * Whiteboard: freehand pen, lines, rectangles, ellipses, text and an eraser.
 * A board is a list of shapes. The canvas is redrawn from that list, so undo,
 * redo, saving and reloading all work from the same data. Boards are kept on
 * this device (IndexedDB).
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const db = window.LocalDB('mixt-whiteboard', ['boards']);

    const canvas = $('canvas');
    const ctx = canvas.getContext('2d');
    const stage = $('stage');
    const boardEl = $('board');
    const colorEl = $('color');
    const widthEl = $('width');
    const undoBtn = $('undo');
    const redoBtn = $('redo');
    const savedEl = $('saved');

    const BACKGROUND = '#ffffff';

    let boards = [];
    let board = null;          // { id, name, shapes, updated }
    let undoStack = [];        // snapshots of shapes before each change
    let redoStack = [];
    let tool = 'pen';
    let drawing = null;        // shape being drawn
    let saveTimer = null;

    // ---------- canvas sizing ----------

    function fitCanvas () {
        const dpr = window.devicePixelRatio || 1;
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        canvas.width = Math.max(1, Math.floor(w * dpr));
        canvas.height = Math.max(1, Math.floor(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw();
    }

    // ---------- drawing ----------

    function drawShape (c, s) {
        c.save();
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.strokeStyle = s.type === 'eraser' ? BACKGROUND : s.color;
        c.fillStyle = s.color;
        c.lineWidth = s.width;
        c.beginPath();
        switch ( s.type ) {
            case 'pen':
            case 'eraser': {
                const pts = s.points;
                if ( pts.length === 1 ) {
                    c.arc(pts[0].x, pts[0].y, s.width / 2, 0, Math.PI * 2);
                    c.fill();
                    break;
                }
                c.moveTo(pts[0].x, pts[0].y);
                for ( let i = 1; i < pts.length; i++ ) c.lineTo(pts[i].x, pts[i].y);
                c.stroke();
                break;
            }
            case 'line':
                c.moveTo(s.x1, s.y1);
                c.lineTo(s.x2, s.y2);
                c.stroke();
                break;
            case 'rect':
                c.strokeRect(Math.min(s.x1, s.x2), Math.min(s.y1, s.y2), Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
                break;
            case 'ellipse': {
                const cx = (s.x1 + s.x2) / 2;
                const cy = (s.y1 + s.y2) / 2;
                const rx = Math.abs(s.x2 - s.x1) / 2;
                const ry = Math.abs(s.y2 - s.y1) / 2;
                c.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
                c.stroke();
                break;
            }
            case 'text':
                c.font = `${s.size || 18}px system-ui, sans-serif`;
                c.textBaseline = 'top';
                c.fillText(s.text, s.x, s.y);
                break;
        }
        c.restore();
    }

    function redraw () {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = BACKGROUND;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.save();
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
        if ( board ) for ( const s of board.shapes ) drawShape(ctx, s);
        if ( drawing ) drawShape(ctx, drawing);
        ctx.restore();
    }

    // ---------- coordinates and pointer input ----------

    function pointOf (e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    canvas.addEventListener('pointerdown', (e) => {
        if ( ! board ) return;   // still loading the saved board
        if ( tool === 'text' ) {
            placeText(pointOf(e));
            return;
        }
        canvas.setPointerCapture(e.pointerId);
        const p = pointOf(e);
        const width = Number(widthEl.value);
        const color = colorEl.value;
        if ( tool === 'pen' || tool === 'eraser' ) {
            drawing = { type: tool, color, width: tool === 'eraser' ? width * 3 : width, points: [p] };
        } else {
            drawing = { type: tool, color, width, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        }
        redraw();
    });

    canvas.addEventListener('pointermove', (e) => {
        if ( ! drawing ) return;
        const p = pointOf(e);
        if ( drawing.points ) {
            drawing.points.push(p);
        } else {
            drawing.x2 = p.x;
            drawing.y2 = p.y;
        }
        redraw();
    });

    function finishStroke () {
        if ( ! drawing ) return;
        const shape = drawing;
        drawing = null;
        const tiny = shape.points
            ? shape.points.length === 1
            : Math.abs(shape.x2 - shape.x1) < 2 && Math.abs(shape.y2 - shape.y1) < 2;
        if ( tiny && shape.type !== 'pen' && shape.type !== 'eraser' ) {
            redraw();
            return;
        }
        commit(() => board.shapes.push(shape));
    }

    canvas.addEventListener('pointerup', finishStroke);
    canvas.addEventListener('pointercancel', finishStroke);

    function placeText (p) {
        const input = document.createElement('div');
        input.className = 'text-input';
        input.contentEditable = 'true';
        input.style.left = p.x + 'px';
        input.style.top = p.y + 'px';
        input.style.color = colorEl.value;
        input.style.fontSize = Math.max(12, Number(widthEl.value) * 4) + 'px';
        stage.appendChild(input);
        // Focus after the pointer click finishes; the click itself would move focus
        // to the page and close the box straight away.
        setTimeout(() => input.focus(), 0);
        let done = false;
        const finish = (keep) => {
            if ( done ) return;
            done = true;
            const text = input.innerText.trim();
            input.remove();
            if ( keep && text ) {
                commit(() => board.shapes.push({
                    type: 'text',
                    color: colorEl.value,
                    x: p.x,
                    y: p.y,
                    text,
                    size: Math.max(12, Number(widthEl.value) * 4),
                }));
            }
        };
        input.addEventListener('keydown', (e) => {
            if ( e.key === 'Escape' ) { e.preventDefault(); finish(false); }
            else if ( e.key === 'Enter' && ! e.shiftKey ) { e.preventDefault(); finish(true); }
        });
        input.addEventListener('blur', () => finish(true));
    }

    // ---------- undo / redo / saving ----------

    // Run a change to board.shapes, remembering the previous state for undo.
    function commit (change) {
        undoStack.push(JSON.stringify(board.shapes));
        if ( undoStack.length > 200 ) undoStack.shift();
        redoStack = [];
        change();
        board.updated = Date.now();
        redraw();
        updateButtons();
        scheduleSave();
    }

    function restore (snapshot) {
        board.shapes = JSON.parse(snapshot);
        board.updated = Date.now();
        redraw();
        updateButtons();
        scheduleSave();
    }

    function undo () {
        if ( ! undoStack.length ) return;
        redoStack.push(JSON.stringify(board.shapes));
        restore(undoStack.pop());
    }

    function redo () {
        if ( ! redoStack.length ) return;
        undoStack.push(JSON.stringify(board.shapes));
        restore(redoStack.pop());
    }

    function updateButtons () {
        undoBtn.disabled = ! undoStack.length;
        redoBtn.disabled = ! redoStack.length;
    }

    function scheduleSave () {
        savedEl.textContent = 'Saving...';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNow, 300);
    }

    async function saveNow () {
        if ( ! board ) return;
        clearTimeout(saveTimer);
        await db.put('boards', board);
        savedEl.textContent = 'Saved on this device';
    }

    // ---------- boards ----------

    function fillBoardList () {
        boardEl.innerHTML = boards.map((b) => `<option value="${b.id}">${b.name.replace(/[&<>"]/g, '')}</option>`).join('');
        if ( board ) boardEl.value = board.id;
    }

    function openBoard (id) {
        const found = boards.find((b) => b.id === id);
        if ( ! found ) return;
        board = found;
        undoStack = [];
        redoStack = [];
        drawing = null;
        fillBoardList();
        updateButtons();
        redraw();
        savedEl.textContent = 'Saved on this device';
    }

    async function createBoard (name) {
        const b = {
            id: 'board-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            name: (name || '').trim() || 'Untitled board',
            shapes: [],
            updated: Date.now(),
        };
        boards.push(b);
        boards.sort((x, y) => x.name.localeCompare(y.name));
        await db.put('boards', b);
        openBoard(b.id);
    }

    async function loadBoards () {
        boards = (await db.all('boards')).sort((a, b) => a.name.localeCompare(b.name));
        if ( ! boards.length ) {
            await createBoard('Untitled board');
            return;
        }
        const last = [...boards].sort((a, b) => b.updated - a.updated)[0];
        openBoard(last.id);
    }

    // ---------- export ----------

    function exportPng () {
        const dpr = window.devicePixelRatio || 1;
        const out = document.createElement('canvas');
        out.width = canvas.width;
        out.height = canvas.height;
        const c = out.getContext('2d');
        c.fillStyle = BACKGROUND;
        c.fillRect(0, 0, out.width, out.height);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        for ( const s of board.shapes ) drawShape(c, s);
        out.toBlob((blob) => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = (board.name || 'board').replace(/[\\/:*?"<>|]+/g, '_') + '.png';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }, 'image/png');
    }

    // ---------- events ----------

    document.querySelectorAll('[data-tool]').forEach((btn) => {
        btn.addEventListener('click', () => {
            tool = btn.dataset.tool;
            document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        });
    });

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

    $('clear').addEventListener('click', () => {
        if ( ! board || ! board.shapes.length ) return;
        if ( ! window.confirm('Clear everything on this board? You can undo this.') ) return;
        commit(() => { board.shapes = []; });
    });

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if ( e.target && e.target.isContentEditable ) return;
        if ( tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' ) return;
        if ( (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' ) {
            e.preventDefault();
            if ( e.shiftKey ) redo(); else undo();
        } else if ( (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' ) {
            e.preventDefault();
            redo();
        }
    });

    boardEl.addEventListener('change', () => openBoard(boardEl.value));

    $('new').addEventListener('click', () => {
        const name = window.prompt('Name for the new board', 'Untitled board');
        if ( name !== null ) createBoard(name);
    });

    $('rename').addEventListener('click', async () => {
        if ( ! board ) return;
        const name = window.prompt('Rename board', board.name);
        if ( name === null || ! name.trim() ) return;
        board.name = name.trim();
        board.updated = Date.now();
        await saveNow();
        boards.sort((x, y) => x.name.localeCompare(y.name));
        fillBoardList();
    });

    $('delete').addEventListener('click', async () => {
        if ( ! board ) return;
        if ( ! window.confirm(`Delete "${board.name}"? This cannot be undone.`) ) return;
        const id = board.id;
        clearTimeout(saveTimer);
        await db.remove('boards', id);
        boards = boards.filter((b) => b.id !== id);
        board = null;
        if ( boards.length ) openBoard(boards[0].id);
        else await createBoard('Untitled board');
    });

    $('png').addEventListener('click', exportPng);

    window.addEventListener('resize', fitCanvas);
    window.addEventListener('beforeunload', () => { if ( saveTimer ) saveNow(); });

    fitCanvas();
    loadBoards();
})();
