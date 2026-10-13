// American checkers rules. Pure functions, no DOM, so they can be tested in Node.
// Board: 8 rows x 8 cols. Dark squares are those where (row + col) is odd.
// Cell values: '' empty, 'r' red man, 'R' red king, 'b' black man, 'B' black king.
// Red starts at the bottom (rows 5-7) and moves up (row decreases).
// Black starts at the top (rows 0-2) and moves down.

export function newBoard () {
    const board = Array.from({ length: 8 }, () => Array(8).fill(''));
    for ( let row = 0; row < 8; row++ ) {
        for ( let col = 0; col < 8; col++ ) {
            if ( (row + col) % 2 === 0 ) continue;
            if ( row < 3 ) board[row][col] = 'b';
            else if ( row > 4 ) board[row][col] = 'r';
        }
    }
    return board;
}

export const colorOf = (piece) => (piece === 'r' || piece === 'R') ? 'red' : (piece === 'b' || piece === 'B') ? 'black' : null;
const isKing = (piece) => piece === 'R' || piece === 'B';
const inside = (row, col) => row >= 0 && row < 8 && col >= 0 && col < 8;

function directions (piece) {
    if ( isKing(piece) ) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return colorOf(piece) === 'red' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}

/**
 * All legal moves for `color`. A move is { from:[r,c], path:[[r,c],...], captures:[[r,c],...] }.
 * Captures are mandatory: if any capture exists, only captures are returned, and
 * a capture must continue as far as it can.
 */
export function legalMoves (board, color) {
    const captures = [];
    const steps = [];

    for ( let row = 0; row < 8; row++ ) {
        for ( let col = 0; col < 8; col++ ) {
            const piece = board[row][col];
            if ( ! piece || colorOf(piece) !== color ) continue;

            for ( const [dr, dc] of directions(piece) ) {
                const r1 = row + dr, c1 = col + dc;
                if ( inside(r1, c1) && board[r1][c1] === '' ) {
                    steps.push({ from: [row, col], path: [[r1, c1]], captures: [] });
                }
            }
            collectJumps(board, piece, [row, col], board[row][col], [], [], captures, color);
        }
    }
    return captures.length ? captures : steps;
}

// Depth-first search over jump sequences. `grid` is a copy so a jumped piece
// can be treated as gone for the rest of the sequence (it cannot be jumped twice).
function collectJumps (board, piece, from, current, path, caps, out, color) {
    const [row, col] = path.length ? path[path.length - 1] : from;
    let extended = false;
    for ( const [dr, dc] of directions(piece) ) {
        const jr = row + dr, jc = col + dc;
        const lr = row + 2 * dr, lc = col + 2 * dc;
        if ( ! inside(lr, lc) ) continue;
        const over = board[jr][jc];
        if ( ! over || colorOf(over) === color ) continue;
        if ( caps.some(([r, c]) => r === jr && c === jc) ) continue;
        if ( board[lr][lc] !== '' && !(lr === from[0] && lc === from[1]) ) continue;

        extended = true;
        collectJumps(board, piece, from, current, [...path, [lr, lc]], [...caps, [jr, jc]], out, color);
    }
    if ( ! extended && caps.length ) {
        out.push({ from, path: [...path], captures: caps });
    }
}

/** Apply a move; returns a new board. Promotes a man that ends on the far row. */
export function applyMove (board, move) {
    const next = board.map((r) => r.slice());
    let piece = next[move.from[0]][move.from[1]];
    next[move.from[0]][move.from[1]] = '';
    for ( const [r, c] of move.captures ) next[r][c] = '';
    const [er, ec] = move.path[move.path.length - 1];
    if ( piece === 'r' && er === 0 ) piece = 'R';
    if ( piece === 'b' && er === 7 ) piece = 'B';
    next[er][ec] = piece;
    return next;
}

/** 'red' | 'black' | null (game over, the side to move has no moves). */
export function winner (board, toMove) {
    if ( legalMoves(board, toMove).length > 0 ) return null;
    return toMove === 'red' ? 'black' : 'red';
}
