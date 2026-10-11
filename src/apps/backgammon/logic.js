// Backgammon rules (hot-seat, no doubling cube). Pure functions, no DOM.
// points[0..23]: positive = white checkers, negative = black checkers.
// White moves from index 23 toward 0 and bears off past 0. Home: 0..5.
// Black moves from index 0 toward 23 and bears off past 23. Home: 18..23.
// bar: { white, black } checkers waiting to re-enter. off: { white, black } borne off.

export function newGame () {
    // Standard opening. White: 2 on the 24-point, 5 on the 13-point, 3 on the 8-point,
    // 5 on the 6-point. Black is the mirror image.
    const points = Array(24).fill(0);
    points[23] = 2;   // white 24-point
    points[12] = 5;   // white 13-point
    points[7] = 3;    // white 8-point
    points[5] = 5;    // white 6-point
    points[0] = -2;   // black 24-point
    points[11] = -5;  // black 13-point
    points[16] = -3;  // black 8-point
    points[18] = -5;  // black 6-point
    return {
        points,
        bar: { white: 0, black: 0 },
        off: { white: 0, black: 0 },
        turn: 'white',
        dice: [],
        roll: null,
    };
}

export function rollDice (s, rand = Math.random) {
    const a = 1 + Math.floor(rand() * 6);
    const b = 1 + Math.floor(rand() * 6);
    const dice = a === b ? [a, a, a, a] : [a, b];
    return { ...s, dice, roll: [a, b] };
}

const dirOf = (color) => (color === 'white' ? -1 : 1);
const ownCount = (points, color) => (i) => (color === 'white' ? points[i] : -points[i]);

/** Index a checker of `color` reaches with die `d` from index `from` (or the bar when from is 'bar'). */
function targetOf (color, from, d) {
    if ( from === 'bar' ) return color === 'white' ? 24 - d : d - 1;
    return from + dirOf(color) * d;
}

function allHome (s, color) {
    const home = color === 'white' ? [0, 5] : [18, 23];
    if ( s.bar[color] > 0 ) return false;
    for ( let i = 0; i < 24; i++ ) {
        if ( i >= home[0] && i <= home[1] ) continue;
        if ( ownCount(s.points, color)(i) > 0 ) return false;
    }
    return true;
}

/** Legal moves for the side to move, one per die use. Each: { from, to, die, bearOff }. */
export function legalMoves (s) {
    const color = s.turn;
    const moves = [];
    const dice = [...new Set(s.dice)];
    const own = ownCount(s.points, color);

    // While checkers are on the bar, only entering is allowed.
    if ( s.bar[color] > 0 ) {
        for ( const d of dice ) {
            const to = targetOf(color, 'bar', d);
            if ( canLand(s, color, to) ) moves.push({ from: 'bar', to, die: d, bearOff: false });
        }
        return moves;
    }

    for ( let i = 0; i < 24; i++ ) {
        if ( own(i) <= 0 ) continue;
        for ( const d of dice ) {
            const to = targetOf(color, i, d);
            if ( to >= 0 && to < 24 ) {
                if ( canLand(s, color, to) ) moves.push({ from: i, to, die: d, bearOff: false });
                continue;
            }
            // Bearing off: only when every checker is home.
            if ( ! allHome(s, color) ) continue;
            const exact = (color === 'white' ? i + 1 : 24 - i) === d;
            const furthest = !hasCheckerBehind(s, color, i);
            if ( exact || furthest ) moves.push({ from: i, to: 'off', die: d, bearOff: true });
        }
    }
    return moves;
}

function hasCheckerBehind (s, color, i) {
    // "Behind" means farther from the edge the checker bears off from.
    const range = color === 'white' ? [i + 1, 23] : [0, i - 1];
    for ( let j = range[0]; j <= range[1]; j++ ) {
        if ( j < 0 || j > 23 ) continue;
        if ( ownCount(s.points, color)(j) > 0 ) return true;
    }
    return false;
}

function canLand (s, color, to) {
    const cur = s.points[to];
    if ( color === 'white' ? cur < -1 : cur > 1 ) return false; // blocked by two or more of the other colour
    return true;
}

/** Apply one move (from legalMoves). Returns a new state with the die used up. */
export function applyMove (s, m) {
    const color = s.turn;
    const next = { ...s, points: s.points.slice(), bar: { ...s.bar }, off: { ...s.off } };
    const sign = color === 'white' ? 1 : -1;

    if ( m.from === 'bar' ) next.bar[color]--;
    else next.points[m.from] -= sign;

    if ( m.bearOff ) {
        next.off[color]++;
    } else {
        const target = next.points[m.to];
        if ( target !== 0 && Math.sign(target) === -sign ) {
            // Hit a single checker of the other colour.
            const other = color === 'white' ? 'black' : 'white';
            next.bar[other]++;
            next.points[m.to] = 0;
        }
        next.points[m.to] += sign;
    }

    const idx = next.dice.indexOf(m.die);
    next.dice = next.dice.slice(0, idx).concat(next.dice.slice(idx + 1));
    return next;
}

/** After moves: pass the turn when dice are used up or no legal move remains. */
export function finishTurnIfDone (s) {
    if ( s.dice.length === 0 || legalMoves(s).length === 0 ) {
        return { ...s, turn: s.turn === 'white' ? 'black' : 'white', dice: [], roll: null };
    }
    return s;
}

export function winner (s) {
    if ( s.off.white === 15 ) return 'white';
    if ( s.off.black === 15 ) return 'black';
    return null;
}
