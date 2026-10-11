// Run with: node src/apps/backgammon/logic.test.mjs
import assert from 'node:assert/strict';
import { newGame, legalMoves, applyMove, finishTurnIfDone, winner } from './logic.js';

const total = (s, color) => s.points.reduce((n, v) => n + (color === 'white' ? Math.max(v, 0) : Math.max(-v, 0)), 0)
    + s.bar[color] + s.off[color];

// Opening: 15 checkers each, correct layout.
{
    const s = newGame();
    assert.equal(total(s, 'white'), 15);
    assert.equal(total(s, 'black'), 15);
    assert.equal(s.points[23], 2);
    assert.equal(s.points[0], -2);
}

// Moving a white checker with a 3 from the 6-point to the 3-point (index 5 -> 2).
{
    const s = { ...newGame(), dice: [3, 4] };
    const m = legalMoves(s).find((x) => x.from === 5 && x.die === 3);
    assert.ok(m);
    const next = applyMove(s, m);
    assert.equal(next.points[5], 4);
    assert.equal(next.points[2], 1);
    assert.deepEqual(next.dice, [4]);
    assert.equal(total(next, 'white'), 15);
}

// Hitting a blot sends it to the bar.
{
    const s = newGame();
    s.points = Array(24).fill(0);
    s.points[5] = 2;
    s.points[2] = -1;
    s.dice = [3];
    const next = applyMove(s, { from: 5, to: 2, die: 3, bearOff: false });
    assert.equal(next.bar.black, 1);
    assert.equal(next.points[2], 1);
}

// A point held by two of the other colour blocks.
{
    const s = newGame();
    s.points = Array(24).fill(0);
    s.points[5] = 2;
    s.points[2] = -2;
    s.dice = [3];
    assert.equal(legalMoves(s).filter((m) => m.from === 5).length, 0);
}

// With a checker on the bar, only entering moves are offered.
{
    const s = newGame();
    s.bar.white = 1;
    s.dice = [2, 5];
    const moves = legalMoves(s);
    assert.ok(moves.every((m) => m.from === 'bar'));
    // White enters at index 24 - die: a 2 lands on index 22.
    assert.ok(moves.some((m) => m.die === 2 && m.to === 22));
}

// Passing: with no legal moves, the turn switches.
{
    const s = newGame();
    s.points = Array(24).fill(0);
    s.points[5] = 2;
    s.points[2] = -2;
    s.dice = [3];
    const done = finishTurnIfDone(s);
    assert.equal(done.turn, 'black');
    assert.deepEqual(done.dice, []);
}

// Bearing off: once every white checker is home, an exact die removes one.
{
    const s = newGame();
    s.points = Array(24).fill(0);
    s.points[2] = 3;
    s.points[0] = 2;
    s.points[23] = -15;
    s.dice = [3];
    const m = legalMoves(s).find((x) => x.bearOff && x.from === 2);
    assert.ok(m);
    const next = applyMove(s, m);
    assert.equal(next.off.white, 1);
}

// Winner after 15 off.
{
    const s = newGame();
    s.off.black = 15;
    assert.equal(winner(s), 'black');
    assert.equal(winner(newGame()), null);
}

console.log('backgammon logic: all tests passed');
