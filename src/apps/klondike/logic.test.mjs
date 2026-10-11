// Run with: node src/apps/klondike/logic.test.mjs
import assert from 'node:assert/strict';
import { newGame, move, drawOne, isWon } from './logic.js';

const card = (rank, suit, up = true) => ({ rank, suit, up });

// Deal: 7 piles, the top card of each face up, 24 in stock.
{
    const g = newGame(() => 0.5);
    assert.deepEqual(g.tableau.map((p) => p.length), [1, 2, 3, 4, 5, 6, 7]);
    assert.ok(g.tableau.every((p) => p[p.length - 1].up));
    assert.equal(g.stock.length, 24);
    assert.equal(g.stock.concat(...g.tableau).length, 52);
}

// Foundation: an ace starts a pile, and only the next rank of the same suit fits.
{
    const base = newGame(() => 0.5);
    const state = { ...base, waste: [card(1, 'S')], tableau: base.tableau.map(() => []), foundations: { S: [], H: [], D: [], C: [] } };
    const ok = move(state, { from: 'waste' }, { to: 'foundation', suit: 'S' });
    assert.equal(ok.foundations.S.length, 1);
    const bad = move({ ...state, waste: [card(3, 'S')] }, { from: 'waste' }, { to: 'foundation', suit: 'S' });
    assert.equal(bad, null);
}

// Tableau: a king can go on an empty pile, and red-on-black only with rank one lower.
{
    const base = newGame(() => 0.5);
    const state = {
        ...base,
        waste: [card(13, 'H')],
        tableau: [[], [card(12, 'S')], [], [], [], [], []],
        foundations: { S: [], H: [], D: [], C: [] },
    };
    assert.ok(move(state, { from: 'waste' }, { to: 'tableau', col: 0 }));
    assert.equal(move(state, { from: 'waste' }, { to: 'tableau', col: 1 }), null);
    const s2 = { ...state, waste: [card(11, 'H')] };
    assert.ok(move(s2, { from: 'waste' }, { to: 'tableau', col: 1 }));
    const s3 = { ...state, waste: [card(11, 'S')] };
    assert.equal(move(s3, { from: 'waste' }, { to: 'tableau', col: 1 }), null);
}

// Turning over a card left on a pile after moving the card above it.
{
    const base = newGame(() => 0.5);
    const state = {
        ...base,
        waste: [],
        tableau: [[card(5, 'S', false), card(4, 'H')], [card(5, 'C')], [], [], [], [], []],
        foundations: { S: [], H: [], D: [], C: [] },
    };
    const next = move(state, { from: 'tableau', col: 0, index: 1 }, { to: 'tableau', col: 1 });
    assert.ok(next);
    assert.equal(next.tableau[0][0].up, true);
}

// Stock to waste, and recycling the waste back into the stock.
{
    const base = newGame(() => 0.5);
    const s1 = drawOne(base);
    assert.equal(s1.waste.length, 1);
    assert.equal(s1.waste[0].up, true);
    let s = base;
    for (let i = 0; i < 24; i++) s = drawOne(s);
    assert.equal(s.stock.length, 0);
    const recycled = drawOne(s);
    assert.equal(recycled.stock.length, 24);
    assert.equal(recycled.waste.length, 0);
}

// A full game of 52 cards in foundations is a win.
{
    const foundations = {};
    for (const suit of ['S', 'H', 'D', 'C']) foundations[suit] = Array.from({ length: 13 }, (_, i) => card(i + 1, suit));
    assert.equal(isWon({ foundations }), true);
}

console.log('klondike logic: all tests passed');
