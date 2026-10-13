// Sudoku generation and checking. Pure functions, no DOM.
// A grid is 9 arrays of 9 numbers, 0 meaning empty.

export function shuffled (items, rand = Math.random) {
    const a = items.slice();
    for ( let i = a.length - 1; i > 0; i-- ) {
        const j = Math.floor(rand() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function canPlace (grid, r, c, n) {
    for ( let i = 0; i < 9; i++ ) {
        if ( grid[r][i] === n || grid[i][c] === n ) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for ( let i = 0; i < 3; i++ ) {
        for ( let j = 0; j < 3; j++ ) {
            if ( grid[br + i][bc + j] === n ) return false;
        }
    }
    return true;
}

// Fill empty cells by backtracking. Returns true when the grid is full.
export function solve (grid, rand = Math.random) {
    for ( let r = 0; r < 9; r++ ) {
        for ( let c = 0; c < 9; c++ ) {
            if ( grid[r][c] !== 0 ) continue;
            for ( const n of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rand) ) {
                if ( canPlace(grid, r, c, n) ) {
                    grid[r][c] = n;
                    if ( solve(grid, rand) ) return true;
                    grid[r][c] = 0;
                }
            }
            return false;
        }
    }
    return true;
}

const REMOVE = { easy: 36, medium: 46, hard: 54 };

/** Returns { puzzle, solution }. The puzzle keeps the solution's givens. */
export function generate (difficulty = 'medium', rand = Math.random) {
    const solution = Array.from({ length: 9 }, () => Array(9).fill(0));
    solve(solution, rand);
    const puzzle = solution.map((row) => row.slice());
    let toRemove = REMOVE[difficulty] ?? REMOVE.medium;
    for ( const idx of shuffled([...Array(81).keys()], rand) ) {
        if ( toRemove === 0 ) break;
        puzzle[Math.floor(idx / 9)][idx % 9] = 0;
        toRemove--;
    }
    return { puzzle, solution };
}

/** Cells (as "r,c") whose value clashes with another cell in its row, column, or box. */
export function conflicts (grid) {
    const bad = new Set();
    const mark = (cells) => {
        const seen = new Map();
        for ( const [r, c] of cells ) {
            const v = grid[r][c];
            if ( ! v ) continue;
            if ( seen.has(v) ) { bad.add(`${r},${c}`); bad.add(seen.get(v)); }
            else seen.set(v, `${r},${c}`);
        }
    };
    for ( let i = 0; i < 9; i++ ) {
        mark([...Array(9).keys()].map((c) => [i, c]));
        mark([...Array(9).keys()].map((r) => [r, i]));
        const br = Math.floor(i / 3) * 3, bc = (i % 3) * 3;
        mark([...Array(9).keys()].map((k) => [br + Math.floor(k / 3), bc + (k % 3)]));
    }
    return bad;
}

export const isSolved = (grid, solution) =>
    grid.every((row, r) => row.every((v, c) => v === solution[r][c]));
