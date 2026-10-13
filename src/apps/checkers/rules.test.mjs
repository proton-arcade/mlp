// Run with: node src/apps/checkers/rules.test.mjs
import assert from 'node:assert/strict';
import { newBoard, legalMoves, applyMove, winner } from './rules.js';

const empty = () => Array.from({ length: 8 }, () => Array(8).fill(''));

// Opening position: red has 7 moves, all forward steps, no captures.
{
    const moves = legalMoves(newBoard(), 'red');
    assert.equal(moves.length, 7);
    assert.ok(moves.every((m) => m.captures.length === 0));
}

// Mandatory capture: the only legal move is the jump.
{
    const b = empty();
    b[5][2] = 'r';
    b[4][3] = 'b';
    const moves = legalMoves(b, 'red');
    assert.equal(moves.length, 1);
    assert.deepEqual(moves[0].captures, [[4, 3]]);
    const after = applyMove(b, moves[0]);
    assert.equal(after[4][3], '');
    assert.equal(after[3][4], 'r');
}

// Multi-jump: one red man takes two black men in a single move.
{
    const b = empty();
    b[7][0] = 'r';
    b[6][1] = 'b';
    b[4][3] = 'b';
    const moves = legalMoves(b, 'red');
    assert.ok(moves.some((m) => m.captures.length === 2), 'double jump is offered');
}

// Promotion on the far row.
{
    const b = empty();
    b[1][2] = 'r';
    const move = legalMoves(b, 'red').find((m) => m.path[0][0] === 0);
    assert.ok(move);
    assert.equal(applyMove(b, move)[0][move.path[0][1]], 'R');
}

// No moves means the side to move has lost.
{
    const b = empty();
    b[0][1] = 'b';
    b[7][6] = 'r';
    assert.equal(winner(b, 'black'), null);
    const stuck = empty();
    stuck[7][0] = 'r';
    assert.equal(winner(stuck, 'red'), null);
    assert.equal(winner(empty(), 'red'), 'black');
}

console.log('checkers rules: all tests passed');
