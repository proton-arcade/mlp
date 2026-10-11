// Sudoku UI. Logic is in logic.js.
import { generate, conflicts, isSolved } from './logic.js';

const gridEl = document.getElementById('grid');
const statusEl = document.getElementById('status');
const diffEl = document.getElementById('difficulty');

let puzzle = null;
let solution = null;
let grid = null;     // current values, 0 for blank
let givens = null;   // Set of "r,c" that came with the puzzle
let focused = null;  // [r, c] of the last cell clicked

function build () {
    gridEl.innerHTML = '';
    for ( let r = 0; r < 9; r++ ) {
        for ( let c = 0; c < 9; c++ ) {
            const cell = document.createElement('div');
            cell.className = 'cell' + (r % 3 === 2 && r < 8 ? ' box-r' : '') + (c % 3 === 2 && c < 8 ? ' box-c' : '');
            const input = document.createElement('input');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.maxLength = 1;
            input.dataset.r = r;
            input.dataset.c = c;
            input.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
            cell.appendChild(input);
            gridEl.appendChild(cell);
        }
    }
}

function paint (showConflicts = false) {
    const bad = showConflicts ? conflicts(grid) : new Set();
    for ( const input of gridEl.querySelectorAll('input') ) {
        const r = Number(input.dataset.r), c = Number(input.dataset.c);
        const v = grid[r][c];
        input.value = v ? String(v) : '';
        input.readOnly = givens.has(`${r},${c}`);
        input.classList.toggle('given', givens.has(`${r},${c}`));
        input.classList.toggle('bad', bad.has(`${r},${c}`));
    }
}

function setValue (r, c, n) {
    if ( givens.has(`${r},${c}`) ) return;
    grid[r][c] = n;
    paint();
    if ( isSolved(grid, solution) ) statusEl.textContent = 'Solved. Well done.';
    else statusEl.textContent = '';
}

function newPuzzle () {
    ({ puzzle, solution } = generate(diffEl.value));
    grid = puzzle.map((row) => row.slice());
    givens = new Set();
    puzzle.forEach((row, r) => row.forEach((v, c) => { if (v) givens.add(`${r},${c}`); }));
    focused = null;
    statusEl.textContent = '';
    paint();
}

gridEl.addEventListener('focusin', (e) => {
    focused = [Number(e.target.dataset.r), Number(e.target.dataset.c)];
});

gridEl.addEventListener('keydown', (e) => {
    const input = e.target;
    const r = Number(input.dataset.r), c = Number(input.dataset.c);
    if ( /^[1-9]$/.test(e.key) ) { e.preventDefault(); setValue(r, c, Number(e.key)); return; }
    if ( e.key === 'Backspace' || e.key === 'Delete' || e.key === '0' ) { e.preventDefault(); setValue(r, c, 0); return; }
    const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if ( moves[e.key] ) {
        e.preventDefault();
        const nr = Math.min(8, Math.max(0, r + moves[e.key][0]));
        const nc = Math.min(8, Math.max(0, c + moves[e.key][1]));
        gridEl.querySelector(`input[data-r="${nr}"][data-c="${nc}"]`).focus();
    }
});

document.querySelector('.pad').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-n]');
    if ( ! btn || ! focused ) return;
    setValue(focused[0], focused[1], Number(btn.dataset.n));
});

document.getElementById('check').addEventListener('click', () => {
    const bad = conflicts(grid);
    if ( bad.size > 0 ) {
        paint(true);
        statusEl.textContent = 'Some numbers clash. They are in red.';
    } else if ( isSolved(grid, solution) ) {
        statusEl.textContent = 'Solved. Well done.';
    } else {
        statusEl.textContent = 'No clashes so far. Keep going.';
    }
});

document.getElementById('new').addEventListener('click', newPuzzle);

build();
newPuzzle();
