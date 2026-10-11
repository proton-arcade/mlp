import { describe, it, expect } from 'vitest';
import { DESKTOP_GRID, nearestCell, cellPosition, snapToDesktopGrid } from './desktopGrid.js';

const bounds = { cols: 6, rows: 5 };
const { cell, pad } = DESKTOP_GRID;

describe('desktop grid', () => {
    it('maps a cell to its top-left pixel and back', () => {
        expect(cellPosition({ col: 2, row: 1 })).toEqual({ left: 2 * cell + pad, top: cell + pad });
        expect(nearestCell(cellPosition({ col: 2, row: 1 }))).toEqual({ col: 2, row: 1 });
    });

    it('snaps to the closest cell', () => {
        // Just right of cell (1,1)'s origin: should stay in (1,1).
        const p = snapToDesktopGrid({ left: cell + pad + 20, top: cell + pad - 30 }, {}, 'a', bounds);
        expect(p).toEqual(cellPosition({ col: 1, row: 1 }));
    });

    it('moves to the nearest free cell when the target is taken', () => {
        const taken = { b: cellPosition({ col: 1, row: 1 }) };
        const p = snapToDesktopGrid(cellPosition({ col: 1, row: 1 }), taken, 'a', bounds);
        expect(p).not.toEqual(cellPosition({ col: 1, row: 1 }));
        // Every free neighbour is one step away.
        const { col, row } = nearestCell(p);
        expect(Math.max(Math.abs(col - 1), Math.abs(row - 1))).toBe(1);
    });

    it('lets an icon keep its own cell', () => {
        const taken = { a: cellPosition({ col: 3, row: 2 }) };
        expect(snapToDesktopGrid(cellPosition({ col: 3, row: 2 }), taken, 'a', bounds))
            .toEqual(cellPosition({ col: 3, row: 2 }));
    });

    it('keeps icons inside the desktop', () => {
        const p = snapToDesktopGrid({ left: -500, top: -500 }, {}, 'a', bounds);
        expect(p).toEqual(cellPosition({ col: 0, row: 0 }));
        const q = snapToDesktopGrid({ left: 9999, top: 9999 }, {}, 'a', bounds);
        const c = nearestCell(q);
        expect(c.col).toBeLessThan(bounds.cols);
        expect(c.row).toBeLessThan(bounds.rows);
    });
});
