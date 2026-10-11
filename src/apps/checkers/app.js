// Checkers UI: hot-seat, red moves first. Rules live in rules.js.
import { newBoard, legalMoves, applyMove, winner, colorOf } from './rules.js';

const GLYPH = { r: '●', R: '♛', b: '○', B: '♕' };
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

let board = newBoard();
let turn = 'red';
let selected = null;   // [row, col] of the piece being moved
let options = [];      // legal moves from the selected square
let history = [];

const sameSquare = (a, b) => a[0] === b[0] && a[1] === b[1];

function render () {
    boardEl.innerHTML = '';
    for ( let row = 0; row < 8; row++ ) {
        for ( let col = 0; col < 8; col++ ) {
            const dark = (row + col) % 2 === 1;
            const sq = document.createElement('div');
            sq.className = 'sq ' + (dark ? 'dark' : 'light');
            sq.dataset.row = row;
            sq.dataset.col = col;
            if ( selected && sameSquare(selected, [row, col]) ) sq.classList.add('sel');
            if ( options.some((m) => sameSquare(m.path[m.path.length - 1], [row, col])) ) sq.classList.add('hint');
            const piece = board[row][col];
            if ( piece ) {
                const span = document.createElement('span');
                span.className = 'piece ' + colorOf(piece);
                span.textContent = GLYPH[piece];
                sq.appendChild(span);
            }
            boardEl.appendChild(sq);
        }
    }

    const over = winner(board, turn);
    if ( over ) {
        statusEl.textContent = `${over === 'red' ? 'Red' : 'Black'} wins. Press New game to play again.`;
    } else {
        const forced = legalMoves(board, turn).some((m) => m.captures.length > 0);
        statusEl.textContent = `${turn === 'red' ? 'Red' : 'Black'} to move${forced ? ' (a capture is required)' : ''}.`;
    }
    document.getElementById('undo').disabled = history.length === 0;
}

function play (move) {
    history.push({ board, turn });
    board = applyMove(board, move);
    turn = turn === 'red' ? 'black' : 'red';
    selected = null;
    options = [];
    render();
}

boardEl.addEventListener('click', (e) => {
    const sq = e.target.closest('.sq');
    if ( ! sq || winner(board, turn) ) return;
    const pos = [Number(sq.dataset.row), Number(sq.dataset.col)];

    // Choosing a destination for the selected piece.
    const chosen = options.find((m) => sameSquare(m.path[m.path.length - 1], pos));
    if ( selected && chosen ) {
        play(chosen);
        return;
    }

    const piece = board[pos[0]][pos[1]];
    if ( piece && colorOf(piece) === turn ) {
        selected = pos;
        options = legalMoves(board, turn).filter((m) => sameSquare(m.from, pos));
    } else {
        selected = null;
        options = [];
    }
    render();
});

document.getElementById('new').addEventListener('click', () => {
    board = newBoard();
    turn = 'red';
    selected = null;
    options = [];
    history = [];
    render();
});

document.getElementById('undo').addEventListener('click', () => {
    const prev = history.pop();
    if ( ! prev ) return;
    board = prev.board;
    turn = prev.turn;
    selected = null;
    options = [];
    render();
});

render();
