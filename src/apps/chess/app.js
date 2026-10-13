// Chess: a hot-seat game. Rules come from chess.js (vendor/chess.js, BSD-2).
import { Chess } from './vendor/chess.js';

const PIECES = {
    w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
    b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};
const FILES = 'abcdefgh';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const movesEl = document.getElementById('moves');
const undoBtn = document.getElementById('undo');

let game = new Chess();
let selected = null;
let targets = [];

// Squares are drawn from the top-left (a8) to the bottom-right (h1).
function squareName (row, col) {
    return FILES[col] + (8 - row);
}

function describeStatus () {
    if ( game.isCheckmate() ) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        return `Checkmate. ${winner} wins.`;
    }
    if ( game.isStalemate() ) return 'Stalemate. The game is a draw.';
    if ( game.isDraw() ) return 'Draw.';
    const side = game.turn() === 'w' ? 'White' : 'Black';
    return `${side} to move${game.isCheck() ? ' (check!)' : ''}.`;
}

function render () {
    boardEl.innerHTML = '';
    const last = game.history({ verbose: true }).slice(-1)[0];
    for ( let row = 0; row < 8; row++ ) {
        for ( let col = 0; col < 8; col++ ) {
            const name = squareName(row, col);
            const piece = game.get(name);
            const sq = document.createElement('div');
            sq.className = 'sq ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
            sq.dataset.square = name;
            sq.setAttribute('role', 'button');
            sq.setAttribute('aria-label', piece ? `${name}, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : name);
            if ( last && (last.from === name || last.to === name) ) sq.classList.add('last');
            if ( selected === name ) sq.classList.add('sel');
            if ( targets.includes(name) ) sq.classList.add('hint');
            if ( piece ) sq.textContent = PIECES[piece.color][piece.type];
            boardEl.appendChild(sq);
        }
    }
    statusEl.textContent = describeStatus();
    undoBtn.disabled = game.history().length === 0;

    movesEl.innerHTML = '';
    const history = game.history();
    for ( let i = 0; i < history.length; i += 2 ) {
        const li = document.createElement('li');
        li.textContent = `${i / 2 + 1}. ${history[i]}${history[i + 1] ? '  ' + history[i + 1] : ''}`;
        movesEl.appendChild(li);
    }
    movesEl.scrollTop = movesEl.scrollHeight;
}

function tryMove (from, to) {
    const piece = game.get(from);
    const promotion = piece && piece.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : undefined;
    const move = game.move({ from, to, promotion });
    return Boolean(move);
}

boardEl.addEventListener('click', (e) => {
    const sq = e.target.closest('.sq');
    if ( ! sq ) return;
    const name = sq.dataset.square;
    const piece = game.get(name);

    if ( selected && targets.includes(name) ) {
        tryMove(selected, name);
        selected = null;
        targets = [];
        render();
        return;
    }
    if ( piece && piece.color === game.turn() ) {
        selected = name;
        targets = game.moves({ square: name, verbose: true }).map((m) => m.to);
    } else {
        selected = null;
        targets = [];
    }
    render();
});

document.getElementById('new').addEventListener('click', () => {
    game = new Chess();
    selected = null;
    targets = [];
    render();
});

undoBtn.addEventListener('click', () => {
    game.undo();
    selected = null;
    targets = [];
    render();
});

render();
