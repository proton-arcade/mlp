// Backgammon UI: hot-seat. Rules live in logic.js.
import { newGame, rollDice, legalMoves, applyMove, finishTurnIfDone, winner } from './logic.js';

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const rollBtn = document.getElementById('roll');

let state = newGame();
let selected = null; // 'bar' or a point index
let options = [];

const label = (c) => (c === 'white' ? 'White' : 'Black');

function pointEl (i) {
    const el = document.createElement('div');
    el.className = 'point ' + (i % 2 === 0 ? 'a' : 'b');
    el.dataset.index = i;
    const v = state.points[i];
    const n = Math.abs(v);
    for ( let k = 0; k < Math.min(n, 6); k++ ) {
        const c = document.createElement('span');
        c.className = 'chip ' + (v > 0 ? 'white' : 'black');
        el.appendChild(c);
    }
    if ( n > 6 ) {
        const more = document.createElement('span');
        more.className = 'more';
        more.textContent = `+${n - 6}`;
        el.appendChild(more);
    }
    if ( selected === i ) el.classList.add('sel');
    if ( options.some((m) => m.to === i) ) el.classList.add('hint');
    return el;
}

function render () {
    boardEl.innerHTML = '';
    const top = document.createElement('div');
    top.className = 'half';
    for ( let i = 23; i >= 12; i-- ) top.appendChild(pointEl(i));
    const bottom = document.createElement('div');
    bottom.className = 'half';
    for ( let i = 0; i <= 11; i++ ) bottom.appendChild(pointEl(i));

    const bar = document.createElement('div');
    bar.className = 'bar' + (selected === 'bar' ? ' sel' : '');
    bar.dataset.bar = state.turn;
    bar.title = 'Checkers on the bar';
    bar.textContent = `Bar: W ${state.bar.white} · B ${state.bar.black}`;

    boardEl.appendChild(top);
    boardEl.appendChild(bar);
    boardEl.appendChild(bottom);

    const off = document.getElementById('off');
    off.textContent = `Borne off: White ${state.off.white} · Black ${state.off.black}`;

    const over = winner(state);
    if ( over ) {
        statusEl.textContent = `${label(over)} wins. Press New game to play again.`;
        rollBtn.disabled = true;
    } else if ( ! state.roll ) {
        statusEl.textContent = `${label(state.turn)} to roll.`;
        rollBtn.disabled = false;
    } else {
        statusEl.textContent = `${label(state.turn)} rolled ${state.roll.join(' and ')}. ` +
            (selected === null ? 'Pick a checker to move.' : 'Pick a highlighted point.');
        rollBtn.disabled = true;
    }
    document.getElementById('dice').textContent = state.roll ? state.roll.join(' · ') : '';
}

function afterMove (next) {
    state = finishTurnIfDone(next);
    selected = null;
    options = [];
    render();
}

boardEl.addEventListener('click', (e) => {
    if ( ! state.roll || winner(state) ) return;
    const bar = e.target.closest('.bar');
    const point = e.target.closest('.point');
    let idx = null;
    if ( bar && state.bar[state.turn] > 0 ) idx = 'bar';
    else if ( point ) idx = Number(point.dataset.index);
    if ( idx === null ) return;

    // Destination for the selected source.
    const dest = options.filter((m) => m.from === selected && (m.to === idx));
    if ( selected !== null && dest.length ) {
        // Prefer the smallest die that works, so a choice is never forced by accident.
        const m = dest.sort((a, b) => a.die - b.die)[0];
        afterMove(applyMove(state, m));
        return;
    }

    const own = state.turn === 'white' ? state.points[idx] > 0 : state.points[idx] < 0;
    if ( idx === 'bar' || own ) {
        const from = idx;
        const moves = legalMoves(state).filter((m) => m.from === from);
        selected = moves.length ? from : null;
        options = moves;
    } else {
        selected = null;
        options = [];
    }
    render();
});

rollBtn.addEventListener('click', () => {
    state = rollDice(state);
    // If nothing can move, pass straight away.
    state = finishTurnIfDone(state);
    if ( state.roll === null ) statusEl.textContent = 'No legal moves. The turn passes.';
    selected = null;
    options = [];
    render();
});

document.getElementById('new').addEventListener('click', () => {
    state = newGame();
    selected = null;
    options = [];
    render();
});

render();
