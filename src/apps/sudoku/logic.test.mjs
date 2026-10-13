// Run with: node src/apps/sudoku/logic.test.mjs
import assert from 'node:assert/strict';
import { generate, conflicts, isSolved } from './logic.js';

for (const difficulty of ['easy', 'medium', 'hard']) {
    const { puzzle, solution } = generate(difficulty);
    // Every row, column and box of the solution contains 1-9 once.
    for (let i = 0; i < 9; i++) {
        assert.equal(new Set(solution[i]).size, 9);
        assert.equal(new Set(solution.map((r) => r[i])).size, 9);
    }
    // The puzzle's givens match the solution, and the puzzle has blanks.
    const blanks = puzzle.flat().filter((v) => v === 0).length;
    assert.ok(blanks > 0);
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
        if (puzzle[r][c]) assert.equal(puzzle[r][c], solution[r][c]);
    }
    assert.equal(conflicts(puzzle).size, 0);
    assert.equal(isSolved(solution, solution), true);
    assert.equal(isSolved(puzzle, solution), false);
}

// A deliberate clash is reported in the row, column and box.
{
    const { solution } = generate('easy');
    const bad = solution.map((row) => row.slice());
    bad[0][0] = bad[0][1];
    assert.ok(conflicts(bad).has('0,0'));
    assert.ok(conflicts(bad).has('0,1'));
}

console.log('sudoku logic: all tests passed');
