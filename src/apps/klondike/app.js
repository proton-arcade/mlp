// Klondike UI: click the stock to draw; click a card, then click a destination.
import { newGame, move, drawOne, isWon, SUITS } from './logic.js';

const SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED = { H: true, D: true };
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');

let state = null;
let selected = null; // { from: 'waste' } or { from: 'tableau', col, index }

function cardEl (card, extra = '') {
    const el = document.createElement('div');
    el.className = 'card ' + (card.up ? (RED[card.suit] ? 'red' : 'black') + ' up' : 'down') + (extra ? ' ' + extra : '');
    if ( card.up ) el.textContent = `${rankName(card.rank)}${SYM[card.suit]}`;
    return el;
}

function rankName (r) {
    return { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[r] ?? String(r);
}

function slot (kind, data) {
    const el = document.createElement('div');
    el.className = 'slot ' + kind;
    Object.assign(el.dataset, data);
    return el;
}

function render () {
    boardEl.innerHTML = '';

    const top = document.createElement('div');
    top.className = 'row top';
    // Stock
    const stock = slot('stock', { action: 'draw' });
    if ( state.stock.length ) stock.appendChild(cardEl({ up: false }));
    else stock.textContent = '↻';
    top.appendChild(stock);
    // Waste
    const waste = slot('waste', { pile: 'waste' });
    if ( state.waste.length ) {
        const c = cardEl(state.waste[state.waste.length - 1], selected?.from === 'waste' ? 'sel' : '');
        c.dataset.src = 'waste';
        waste.appendChild(c);
    }
    top.appendChild(waste);
    top.appendChild(document.createElement('div')).className = 'gap';
    // Foundations
    for ( const suit of SUITS ) {
        const f = slot('foundation', { to: 'foundation', suit });
        const pile = state.foundations[suit];
        if ( pile.length ) f.appendChild(cardEl(pile[pile.length - 1]));
        else f.textContent = SYM[suit];
        top.appendChild(f);
    }
    boardEl.appendChild(top);

    // Tableau
    const tableau = document.createElement('div');
    tableau.className = 'row tableau';
    state.tableau.forEach((pile, col) => {
        const column = slot('column', { to: 'tableau', col });
        if ( ! pile.length ) column.classList.add('empty');
        pile.forEach((card, index) => {
            const isSel = selected?.from === 'tableau' && selected.col === col && index >= selected.index;
            const c = cardEl(card, isSel ? 'sel' : '');
            c.style.top = `${index * 26}px`;
            if ( card.up ) {
                c.dataset.src = 'tableau';
                c.dataset.col = col;
                c.dataset.index = index;
            }
            column.appendChild(c);
        });
        column.style.height = `${Math.max(120, pile.length * 26 + 110)}px`;
        tableau.appendChild(column);
    });
    boardEl.appendChild(tableau);

    const moves = state.moves;
    if ( isWon(state) ) statusEl.textContent = `You won in ${moves} moves. Press New game to play again.`;
    else statusEl.textContent = selected
        ? 'Now click where the card should go.'
        : `Moves: ${moves}. Click a card to pick it up.`;
    document.getElementById('undo').disabled = true;
}

function attempt (dst) {
    const next = move(state, selected, dst);
    selected = null;
    if ( next ) state = next;
    render();
}

boardEl.addEventListener('click', (e) => {
    const card = e.target.closest('[data-src]');
    const target = e.target.closest('[data-to], [data-action]');

    if ( target?.dataset.action === 'draw' ) {
        selected = null;
        state = drawOne(state);
        render();
        return;
    }

    // With a card picked up, a click on a column or foundation (or a card in it) is the destination.
    if ( selected && target?.dataset.to === 'tableau' ) {
        attempt({ to: 'tableau', col: Number(target.dataset.col) });
        return;
    }
    if ( selected && target?.dataset.to === 'foundation' ) {
        attempt({ to: 'foundation', suit: target.dataset.suit });
        return;
    }

    if ( card ) {
        selected = card.dataset.src === 'waste'
            ? { from: 'waste' }
            : { from: 'tableau', col: Number(card.dataset.col), index: Number(card.dataset.index) };
        render();
        return;
    }

    if ( selected ) {
        selected = null;
        render();
    }
});

document.getElementById('new').addEventListener('click', () => {
    state = newGame();
    selected = null;
    render();
});

state = newGame();
render();
