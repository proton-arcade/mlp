// Klondike solitaire rules (draw one). Pure functions, no DOM.
// A card is { rank: 1..13, suit: 'S'|'H'|'D'|'C', up: boolean }.

export const SUITS = ['S', 'H', 'D', 'C'];
const RED = { H: true, D: true, S: false, C: false };

export function newGame (rand = Math.random) {
    const deck = [];
    for ( const suit of SUITS ) for ( let rank = 1; rank <= 13; rank++ ) deck.push({ rank, suit, up: false });
    for ( let i = deck.length - 1; i > 0; i-- ) {
        const j = Math.floor(rand() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    const tableau = [];
    let k = 0;
    for ( let col = 0; col < 7; col++ ) {
        const pile = deck.slice(k, k + col + 1);
        pile[pile.length - 1].up = true;
        tableau.push(pile);
        k += col + 1;
    }
    return {
        stock: deck.slice(k).map((c) => ({ ...c, up: false })),
        waste: [],
        foundations: { S: [], H: [], D: [], C: [] },
        tableau,
        moves: 0,
    };
}

const canStackOnTableau = (card, target) =>
    !target ? card.rank === 13 : target.up && target.rank === card.rank + 1 && RED[target.suit] !== RED[card.suit];

const canGoToFoundation = (card, pile) =>
    pile.length === 0 ? card.rank === 1 : pile[pile.length - 1].rank === card.rank - 1;

/** Turn one card from the stock onto the waste, or recycle the waste when stock is empty. */
export function drawOne (state) {
    const s = clone(state);
    if ( s.stock.length ) {
        const card = s.stock.pop();
        card.up = true;
        s.waste.push(card);
    } else if ( s.waste.length ) {
        s.stock = s.waste.reverse().map((c) => ({ ...c, up: false }));
        s.waste = [];
    } else {
        return state;
    }
    return s;
}

/**
 * Move from a source to a destination. Sources: { from: 'waste' } or
 * { from: 'tableau', col, index } (index = position of the first card moved, a run).
 * Destinations: { to: 'tableau', col } or { to: 'foundation', suit }.
 * Returns the new state, or null when the move is not legal.
 */
export function move (state, src, dst) {
    const s = clone(state);
    let cards;
    if ( src.from === 'waste' ) {
        if ( ! s.waste.length ) return null;
        cards = [s.waste[s.waste.length - 1]];
    } else {
        const pile = s.tableau[src.col];
        if ( ! pile || ! pile[src.index] || ! pile[src.index].up ) return null;
        cards = pile.slice(src.index);
        // A run must be a descending alternating-colour sequence.
        for ( let i = 1; i < cards.length; i++ ) {
            const a = cards[i - 1], b = cards[i];
            if ( b.rank !== a.rank - 1 || RED[a.suit] === RED[b.suit] ) return null;
        }
    }

    if ( dst.to === 'foundation' ) {
        if ( cards.length !== 1 || cards[0].suit !== dst.suit ) return null;
        if ( ! canGoToFoundation(cards[0], s.foundations[dst.suit]) ) return null;
    } else if ( dst.to === 'tableau' ) {
        const target = s.tableau[dst.col];
        const top = target[target.length - 1];
        if ( ! canStackOnTableau(cards[0], top) ) return null;
    } else {
        return null;
    }

    // Remove from the source.
    if ( src.from === 'waste' ) s.waste.pop();
    else s.tableau[src.col].splice(src.index);
    // Place on the destination.
    if ( dst.to === 'foundation' ) s.foundations[dst.suit].push(cards[0]);
    else s.tableau[dst.col].push(...cards);
    // Turn over the card left on top of a tableau pile.
    if ( src.from === 'tableau' ) {
        const pile = s.tableau[src.col];
        if ( pile.length && ! pile[pile.length - 1].up ) pile[pile.length - 1].up = true;
    }
    s.moves++;
    return s;
}

export const isWon = (state) => SUITS.every((suit) => state.foundations[suit].length === 13);

function clone (state) {
    return {
        stock: state.stock.map((c) => ({ ...c })),
        waste: state.waste.map((c) => ({ ...c })),
        foundations: Object.fromEntries(Object.entries(state.foundations).map(([k, v]) => [k, v.map((c) => ({ ...c }))])),
        tableau: state.tableau.map((p) => p.map((c) => ({ ...c }))),
        moves: state.moves,
    };
}
