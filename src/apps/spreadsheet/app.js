/*
 * Spreadsheet: a grid of cells with formulas, saved on this device (IndexedDB).
 *
 * The formula engine is original code. It supports numbers, text, booleans,
 * cell references (A1), ranges (A1:B3), + - * / ^ % &, comparisons, and the
 * functions SUM, AVERAGE, MIN, MAX, COUNT, ABS, ROUND, SQRT, IF, AND, OR, NOT,
 * CONCAT. Circular references show #CIRC!.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const db = window.LocalDB('mixt-sheets', ['books']);

    const COLS = 26;
    const ROWS = 100;

    const els = {
        book: $('book'),
        table: $('table'),
        grid: $('grid'),
        fx: $('fx'),
        ref: $('ref'),
        saved: $('saved'),
    };

    let books = [];
    let book = null;                  // { id, name, cells, updated }
    let sel = { r: 0, c: 0 };
    let memo = new Map();
    let saveTimer = null;
    let dirty = false;               // the formula bar has text not yet committed

    // ---------- errors ----------

    class CellError extends Error {
        constructor (code) {
            super(code);
            this.code = code;
        }
    }

    // ---------- addresses ----------

    const keyOf = (r, c) => String.fromCharCode(65 + c) + (r + 1);

    function parseAddress (text) {
        const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(text);
        if ( ! m ) return null;
        let c = 0;
        for ( const ch of m[1].toUpperCase() ) c = c * 26 + (ch.charCodeAt(0) - 64);
        c -= 1;
        const r = parseInt(m[2], 10) - 1;
        if ( c < 0 || c >= COLS || r < 0 || r >= ROWS ) return { outOfRange: true };
        return { r, c };
    }

    // ---------- tokenizer and parser ----------

    const TOKEN = /\s*(?:(\d+(?:\.\d*)?(?:[eE][-+]?\d+)?|\.\d+)|("(?:[^"]|"")*")|(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?)(?![A-Za-z0-9_(])|([A-Za-z_][A-Za-z0-9_.]*)|(<>|<=|>=|[-+*\/^&%(),<>=]))/y;

    function tokenize (src) {
        const out = [];
        let pos = 0;
        while ( pos < src.length ) {
            TOKEN.lastIndex = pos;
            const m = TOKEN.exec(src);
            if ( ! m ) {
                if ( /^\s*$/.test(src.slice(pos)) ) break;
                throw new CellError('#NAME?');
            }
            pos = TOKEN.lastIndex;
            if ( m[1] !== undefined ) out.push({ t: 'num', v: parseFloat(m[1]) });
            else if ( m[2] !== undefined ) out.push({ t: 'str', v: m[2].slice(1, -1).replace(/""/g, '"') });
            else if ( m[3] !== undefined ) out.push({ t: 'ref', v: m[3] });
            else if ( m[4] !== undefined ) out.push({ t: 'id', v: m[4].toUpperCase() });
            else out.push({ t: 'op', v: m[5] });
        }
        return out;
    }

    function parseFormula (src) {
        const toks = tokenize(src);
        let i = 0;
        const isOp = (v) => toks[i] && toks[i].t === 'op' && toks[i].v === v;
        const fail = () => { throw new CellError('#VALUE!'); };

        function expr () {
            return compare();
        }

        function compare () {
            let left = concat();
            while ( toks[i] && toks[i].t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(toks[i].v) ) {
                const op = toks[i++].v;
                left = { k: 'bin', op, a: left, b: concat() };
            }
            return left;
        }

        function concat () {
            let left = add();
            while ( isOp('&') ) {
                i++;
                left = { k: 'bin', op: '&', a: left, b: add() };
            }
            return left;
        }

        function add () {
            let left = mul();
            while ( isOp('+') || isOp('-') ) {
                const op = toks[i++].v;
                left = { k: 'bin', op, a: left, b: mul() };
            }
            return left;
        }

        function mul () {
            let left = pow();
            while ( isOp('*') || isOp('/') ) {
                const op = toks[i++].v;
                left = { k: 'bin', op, a: left, b: pow() };
            }
            return left;
        }

        function pow () {
            let left = unary();
            while ( isOp('^') ) {
                i++;
                left = { k: 'bin', op: '^', a: left, b: unary() };
            }
            return left;
        }

        function unary () {
            if ( isOp('-') ) { i++; return { k: 'neg', a: unary() }; }
            if ( isOp('+') ) { i++; return unary(); }
            return postfix();
        }

        function postfix () {
            let node = primary();
            while ( isOp('%') ) {
                i++;
                node = { k: 'bin', op: '/', a: node, b: { k: 'num', v: 100 } };
            }
            return node;
        }

        function primary () {
            const tok = toks[i];
            if ( ! tok ) fail();
            if ( tok.t === 'num' ) { i++; return { k: 'num', v: tok.v }; }
            if ( tok.t === 'str' ) { i++; return { k: 'str', v: tok.v }; }
            if ( tok.t === 'ref' ) {
                i++;
                const parts = tok.v.split(':');
                const a = parseAddress(parts[0]);
                if ( ! a || a.outOfRange ) throw new CellError('#REF!');
                if ( parts.length === 1 ) return { k: 'ref', r: a.r, c: a.c };
                const b = parseAddress(parts[1]);
                if ( ! b || b.outOfRange ) throw new CellError('#REF!');
                return { k: 'range', r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) };
            }
            if ( tok.t === 'id' ) {
                i++;
                if ( isOp('(') ) {
                    i++;
                    const args = [];
                    if ( ! isOp(')') ) {
                        args.push(expr());
                        while ( isOp(',') ) { i++; args.push(expr()); }
                    }
                    if ( ! isOp(')') ) fail();
                    i++;
                    return { k: 'call', name: tok.v, args };
                }
                if ( tok.v === 'TRUE' ) return { k: 'bool', v: true };
                if ( tok.v === 'FALSE' ) return { k: 'bool', v: false };
                throw new CellError('#NAME?');
            }
            if ( isOp('(') ) {
                i++;
                const node = expr();
                if ( ! isOp(')') ) fail();
                i++;
                return node;
            }
            fail();
        }

        if ( ! toks.length ) fail();
        const tree = expr();
        if ( i !== toks.length ) fail();
        return tree;
    }

    // ---------- evaluation ----------

    function toNumber (v) {
        if ( typeof v === 'number' ) return v;
        if ( typeof v === 'boolean' ) return v ? 1 : 0;
        if ( v === '' || v == null ) return 0;
        if ( Array.isArray(v) ) throw new CellError('#VALUE!');
        const s = String(v).trim();
        if ( s !== '' && ! Number.isNaN(Number(s)) ) return Number(s);
        throw new CellError('#VALUE!');
    }

    function toText (v) {
        if ( typeof v === 'number' ) return formatNumber(v);
        if ( typeof v === 'boolean' ) return v ? 'TRUE' : 'FALSE';
        if ( v == null ) return '';
        if ( Array.isArray(v) ) throw new CellError('#VALUE!');
        return String(v);
    }

    function formatNumber (n) {
        if ( ! Number.isFinite(n) ) throw new CellError('#NUM!');
        if ( Number.isInteger(n) && Math.abs(n) < 1e15 ) return String(n);
        return String(parseFloat(n.toPrecision(12)));
    }

    // Flatten arguments: ranges become arrays of values, scalars stay scalars.
    function numbersIn (args) {
        const out = [];
        for ( const a of args ) {
            if ( Array.isArray(a) ) {
                for ( const v of a ) if ( typeof v === 'number' ) out.push(v);
            } else {
                out.push(toNumber(a));
            }
        }
        return out;
    }

    function countNumbersIn (args) {
        let n = 0;
        for ( const a of args ) {
            if ( Array.isArray(a) ) {
                for ( const v of a ) if ( typeof v === 'number' ) n++;
            } else if ( typeof a === 'number' ) {
                n++;
            }
        }
        return n;
    }

    const FUNCTIONS = {
        SUM: (args) => numbersIn(args).reduce((s, n) => s + n, 0),
        AVERAGE: (args) => {
            const nums = numbersIn(args);
            if ( ! nums.length ) throw new CellError('#DIV/0!');
            return nums.reduce((s, n) => s + n, 0) / nums.length;
        },
        MIN: (args) => { const nums = numbersIn(args); return nums.length ? Math.min(...nums) : 0; },
        MAX: (args) => { const nums = numbersIn(args); return nums.length ? Math.max(...nums) : 0; },
        COUNT: (args) => countNumbersIn(args),
        ABS: (args) => Math.abs(toNumber(args[0])),
        SQRT: (args) => {
            const n = toNumber(args[0]);
            if ( n < 0 ) throw new CellError('#NUM!');
            return Math.sqrt(n);
        },
        ROUND: (args) => {
            const n = toNumber(args[0]);
            const digits = args.length > 1 ? Math.trunc(toNumber(args[1])) : 0;
            const f = Math.pow(10, digits);
            return Math.sign(n) * Math.round(Math.abs(n) * f) / f;
        },
        IF: (args) => {
            const cond = args[0];
            const truthy = typeof cond === 'boolean' ? cond : toNumber(cond) !== 0;
            if ( truthy ) return args.length > 1 ? args[1] : true;
            return args.length > 2 ? args[2] : false;
        },
        AND: (args) => flatten(args).every(truthy),
        OR: (args) => flatten(args).some(truthy),
        NOT: (args) => ! truthy(args[0]),
        CONCAT: (args) => flatten(args).map(toText).join(''),
    };

    function flatten (args) {
        const out = [];
        for ( const a of args ) {
            if ( Array.isArray(a) ) out.push(...a.filter((v) => v !== ''));
            else out.push(a);
        }
        return out;
    }

    function truthy (v) {
        if ( typeof v === 'boolean' ) return v;
        if ( typeof v === 'number' ) return v !== 0;
        if ( v === '' || v == null ) return false;
        return toNumber(v) !== 0;
    }

    function compareValues (a, b, op) {
        let x = a;
        let y = b;
        const bothNumeric = (typeof x === 'number' || x === '') && (typeof y === 'number' || y === '');
        if ( bothNumeric ) {
            x = toNumber(x);
            y = toNumber(y);
        } else {
            x = toText(x).toLowerCase();
            y = toText(y).toLowerCase();
        }
        switch ( op ) {
            case '=': return x === y;
            case '<>': return x !== y;
            case '<': return x < y;
            case '>': return x > y;
            case '<=': return x <= y;
            case '>=': return x >= y;
        }
        throw new CellError('#VALUE!');
    }

    function evaluate (node, ctx) {
        switch ( node.k ) {
            case 'num': return node.v;
            case 'str': return node.v;
            case 'bool': return node.v;
            case 'ref': return ctx.cell(node.r, node.c);
            case 'range': {
                const out = [];
                for ( let r = node.r1; r <= node.r2; r++ ) {
                    for ( let c = node.c1; c <= node.c2; c++ ) out.push(ctx.cell(r, c));
                }
                return out;
            }
            case 'neg': return -toNumber(evaluate(node.a, ctx));
            case 'bin': {
                const a = evaluate(node.a, ctx);
                const b = evaluate(node.b, ctx);
                switch ( node.op ) {
                    case '+': return toNumber(a) + toNumber(b);
                    case '-': return toNumber(a) - toNumber(b);
                    case '*': return toNumber(a) * toNumber(b);
                    case '/': {
                        const d = toNumber(b);
                        if ( d === 0 ) throw new CellError('#DIV/0!');
                        return toNumber(a) / d;
                    }
                    case '^': {
                        const p = Math.pow(toNumber(a), toNumber(b));
                        if ( ! Number.isFinite(p) ) throw new CellError('#NUM!');
                        return p;
                    }
                    case '&': return toText(a) + toText(b);
                    default: return compareValues(a, b, node.op);
                }
            }
            case 'call': {
                const fn = FUNCTIONS[node.name];
                if ( ! fn ) throw new CellError('#NAME?');
                // IF evaluates lazily; the other functions take every argument.
                if ( node.name === 'IF' ) {
                    const cond = evaluate(node.args[0], ctx);
                    const truthyCond = typeof cond === 'boolean' ? cond : toNumber(cond) !== 0;
                    const branch = truthyCond ? node.args[1] : node.args[2];
                    return branch ? evaluate(branch, ctx) : truthyCond;
                }
                return fn(node.args.map((a) => evaluate(a, ctx)));
            }
        }
        throw new CellError('#VALUE!');
    }

    // Raw cell text -> stored value. Formulas are evaluated; numbers stay numbers.
    function cellValue (r, c, stack) {
        const k = keyOf(r, c);
        if ( memo.has(k) ) return memo.get(k);
        const raw = book.cells[k];
        let value;
        if ( raw === undefined || raw === '' ) {
            value = '';
        } else if ( raw.startsWith('=') ) {
            if ( stack.has(k) ) {
                value = new CellError('#CIRC!');
            } else {
                stack.add(k);
                try {
                    value = evaluate(parseFormula(raw.slice(1)), ctx(stack));
                } catch (e) {
                    value = e instanceof CellError ? e : new CellError('#VALUE!');
                } finally {
                    stack.delete(k);
                }
            }
        } else if ( /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/.test(raw) ) {
            value = Number(raw);
        } else {
            value = raw;
        }
        memo.set(k, value);
        return value;
    }

    function ctx (stack) {
        return {
            cell (r, c) {
                const v = cellValue(r, c, stack);
                if ( v instanceof CellError ) throw v;
                return v;
            },
        };
    }

    // What a cell shows on the grid.
    function display (r, c) {
        const v = cellValue(r, c, new Set());
        if ( v instanceof CellError ) return { text: v.code, kind: 'err' };
        if ( typeof v === 'number' ) {
            try { return { text: formatNumber(v), kind: 'num' }; } catch (e) { return { text: e.code, kind: 'err' }; }
        }
        if ( typeof v === 'boolean' ) return { text: v ? 'TRUE' : 'FALSE', kind: 'bool' };
        return { text: String(v ?? ''), kind: 'text' };
    }

    // ---------- rendering ----------

    const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));

    function render () {
        memo = new Map();
        let html = '<thead><tr><th></th>';
        for ( let c = 0; c < COLS; c++ ) html += `<th>${String.fromCharCode(65 + c)}</th>`;
        html += '</tr></thead><tbody>';
        for ( let r = 0; r < ROWS; r++ ) {
            html += `<tr><th>${r + 1}</th>`;
            for ( let c = 0; c < COLS; c++ ) {
                const d = display(r, c);
                const classes = [];
                if ( d.kind === 'num' || d.kind === 'bool' ) classes.push('num');
                if ( d.kind === 'err' ) classes.push('err');
                if ( r === sel.r && c === sel.c ) classes.push('sel');
                html += `<td data-r="${r}" data-c="${c}" class="${classes.join(' ')}">${esc(d.text)}</td>`;
            }
            html += '</tr>';
        }
        html += '</tbody>';
        els.table.innerHTML = html;
        updateFormulaBar();
    }

    function updateFormulaBar () {
        const k = keyOf(sel.r, sel.c);
        els.ref.textContent = k;
        if ( ! dirty ) els.fx.value = book.cells[k] ?? '';
    }

    // Write the formula bar into the selected cell, if it has uncommitted text.
    function commitIfDirty () {
        if ( ! dirty ) return;
        dirty = false;
        setCell(sel.r, sel.c, els.fx.value);
    }

    function leaveFormulaBar () {
        dirty = false;
        els.fx.blur();
        els.grid.focus();
    }

    function selectCell (r, c, scroll = true) {
        sel = {
            r: Math.max(0, Math.min(ROWS - 1, r)),
            c: Math.max(0, Math.min(COLS - 1, c)),
        };
        render();
        if ( scroll ) {
            const td = els.table.querySelector(`td[data-r="${sel.r}"][data-c="${sel.c}"]`);
            if ( td ) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    // ---------- editing and saving ----------

    function setCell (r, c, raw) {
        const k = keyOf(r, c);
        const text = String(raw ?? '');
        if ( text === '' ) delete book.cells[k];
        else book.cells[k] = text;
        book.updated = Date.now();
        scheduleSave();
    }

    function commitFormulaBar (dr, dc) {
        commitIfDirty();
        selectCell(sel.r + dr, sel.c + dc);
        leaveFormulaBar();
    }

    function scheduleSave () {
        els.saved.textContent = 'Saving...';
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveNow, 300);
    }

    async function saveNow () {
        if ( ! book ) return;
        clearTimeout(saveTimer);
        await db.put('books', book);
        els.saved.textContent = 'Saved on this device';
    }

    async function loadBooks () {
        books = (await db.all('books')).sort((a, b) => a.name.localeCompare(b.name));
        if ( ! books.length ) {
            await createBook('Untitled');
            return;
        }
        const last = [...books].sort((a, b) => b.updated - a.updated)[0];
        openBook(last.id);
    }

    function fillBookList () {
        els.book.innerHTML = books.map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('');
        if ( book ) els.book.value = book.id;
    }

    function openBook (id) {
        const found = books.find((b) => b.id === id);
        if ( ! found ) return;
        book = found;
        sel = { r: 0, c: 0 };
        fillBookList();
        render();
        els.saved.textContent = 'Saved on this device';
    }

    async function createBook (name) {
        const b = {
            id: 'sheet-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            name: name.trim() || 'Untitled',
            cells: {},
            updated: Date.now(),
        };
        books.push(b);
        books.sort((x, y) => x.name.localeCompare(y.name));
        await db.put('books', b);
        openBook(b.id);
    }

    // ---------- CSV export ----------

    function exportCsv () {
        let lastRow = -1;
        let lastCol = -1;
        for ( const k of Object.keys(book.cells) ) {
            const m = /^([A-Z]+)(\d+)$/.exec(k);
            const c = m[1].charCodeAt(0) - 65;
            const r = parseInt(m[2], 10) - 1;
            if ( r > lastRow ) lastRow = r;
            if ( c > lastCol ) lastCol = c;
        }
        const lines = [];
        for ( let r = 0; r <= lastRow; r++ ) {
            const row = [];
            for ( let c = 0; c <= lastCol; c++ ) {
                const text = display(r, c).text;
                row.push(/[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text);
            }
            lines.push(row.join(','));
        }
        const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (book.name || 'sheet').replace(/[\\/:*?"<>|]+/g, '_') + '.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    // ---------- events ----------

    els.table.addEventListener('mousedown', (e) => {
        const td = e.target.closest('td');
        if ( ! td ) return;
        commitIfDirty();
        selectCell(Number(td.dataset.r), Number(td.dataset.c), false);
    });

    els.table.addEventListener('dblclick', () => els.fx.focus());

    els.fx.addEventListener('input', () => { dirty = true; });

    els.fx.addEventListener('keydown', (e) => {
        if ( e.key === 'Enter' ) {
            e.preventDefault();
            commitFormulaBar(1, 0);
        } else if ( e.key === 'Tab' ) {
            e.preventDefault();
            commitFormulaBar(0, e.shiftKey ? -1 : 1);
        } else if ( e.key === 'Escape' ) {
            e.preventDefault();
            dirty = false;
            updateFormulaBar();
            leaveFormulaBar();
        }
    });

    // Clicking away from the formula bar commits its text to the selected cell.
    els.fx.addEventListener('blur', () => {
        if ( dirty && book ) {
            commitIfDirty();
            render();
        }
    });

    document.addEventListener('keydown', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if ( tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' ) return;
        if ( e.ctrlKey || e.metaKey || e.altKey ) return;
        switch ( e.key ) {
            case 'ArrowUp': e.preventDefault(); selectCell(sel.r - 1, sel.c); return;
            case 'ArrowDown': e.preventDefault(); selectCell(sel.r + 1, sel.c); return;
            case 'ArrowLeft': e.preventDefault(); selectCell(sel.r, sel.c - 1); return;
            case 'ArrowRight': e.preventDefault(); selectCell(sel.r, sel.c + 1); return;
            case 'Enter': e.preventDefault(); selectCell(sel.r + 1, sel.c); return;
            case 'Tab': e.preventDefault(); selectCell(sel.r, sel.c + (e.shiftKey ? -1 : 1)); return;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                setCell(sel.r, sel.c, '');
                render();
                return;
        }
        if ( e.key.length === 1 ) {
            e.preventDefault();
            els.fx.focus();
            els.fx.value = e.key;
            dirty = true;
        }
    });

    els.book.addEventListener('change', () => openBook(els.book.value));

    $('new').addEventListener('click', () => {
        const name = window.prompt('Name for the new workbook', 'Untitled');
        if ( name !== null ) createBook(name);
    });

    $('rename').addEventListener('click', async () => {
        if ( ! book ) return;
        const name = window.prompt('Rename workbook', book.name);
        if ( name === null || ! name.trim() ) return;
        book.name = name.trim();
        book.updated = Date.now();
        await saveNow();
        books.sort((x, y) => x.name.localeCompare(y.name));
        fillBookList();
    });

    $('delete').addEventListener('click', async () => {
        if ( ! book ) return;
        if ( ! window.confirm(`Delete "${book.name}"? This cannot be undone.`) ) return;
        const id = book.id;
        clearTimeout(saveTimer);
        await db.remove('books', id);
        books = books.filter((b) => b.id !== id);
        book = null;
        if ( books.length ) openBook(books[0].id);
        else await createBook('Untitled');
    });

    $('csv').addEventListener('click', exportCsv);

    window.addEventListener('beforeunload', () => {
        if ( saveTimer ) saveNow();
    });

    loadBooks().then(() => els.grid.focus());
})();
