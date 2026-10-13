/*
 * Copyright (C) 2024-present Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Desktop icon grid. Every icon sits in one cell; a dropped icon snaps to the
 * nearest cell that is free. Positions are stored as the top-left pixel of
 * the cell, so the saved shape (`{ left, top }`) matches what the desktop
 * already persists.
 */
export const DESKTOP_GRID = Object.freeze({ cell: 100, pad: 10 });

/** Column and row of the cell whose top-left corner is nearest to `pos`. */
export function nearestCell (pos, grid = DESKTOP_GRID) {
    const col = Math.round((pos.left - grid.pad) / grid.cell);
    const row = Math.round((pos.top - grid.pad) / grid.cell);
    return { col: Math.max(0, col), row: Math.max(0, row) };
}

/** Pixel position (top-left) of a cell. */
export function cellPosition ({ col, row }, grid = DESKTOP_GRID) {
    return { left: col * grid.cell + grid.pad, top: row * grid.cell + grid.pad };
}

const keyOf = ({ col, row }) => `${col},${row}`;

/**
 * Snap a dropped position to the grid.
 *
 * @param {{left:number, top:number}} pos        where the icon was dropped
 * @param {Record<string, {left:number, top:number}>} positions
 *        saved positions of every icon, keyed by uid
 * @param {string} uid                           the icon being dropped
 * @param {{cols:number, rows:number}} bounds    usable grid size
 * @param {object} [grid]                        cell size and padding
 * @returns {{left:number, top:number}}          snapped pixel position
 */
export function snapToDesktopGrid (pos, positions, uid, bounds, grid = DESKTOP_GRID) {
    const taken = new Set();
    for ( const [key, other] of Object.entries(positions ?? {}) ) {
        if ( key === uid || !other ) continue;
        taken.add(keyOf(nearestCell(other, grid)));
    }

    const fits = (c) => c.col >= 0 && c.row >= 0 &&
        c.col < bounds.cols && c.row < bounds.rows;

    // Start from the nearest cell that is on the desktop, so a drop past the
    // edge still searches the grid instead of an off-screen ring.
    const nearest = nearestCell(pos, grid);
    const want = {
        col: Math.min(nearest.col, Math.max(0, bounds.cols - 1)),
        row: Math.min(nearest.row, Math.max(0, bounds.rows - 1)),
    };

    if ( fits(want) && ! taken.has(keyOf(want)) ) {
        return cellPosition(want, grid);
    }

    // Walk outward ring by ring; within a ring, nearest cell first.
    const maxRadius = Math.max(bounds.cols, bounds.rows);
    for ( let r = 1; r <= maxRadius; r++ ) {
        const candidates = [];
        for ( let dx = -r; dx <= r; dx++ ) {
            for ( let dy = -r; dy <= r; dy++ ) {
                if ( Math.max(Math.abs(dx), Math.abs(dy)) !== r ) continue;
                candidates.push({ col: want.col + dx, row: want.row + dy, d: dx * dx + dy * dy });
            }
        }
        candidates.sort((a, b) => a.d - b.d);
        for ( const c of candidates ) {
            if ( fits(c) && ! taken.has(keyOf(c)) ) {
                return cellPosition(c, grid);
            }
        }
    }

    // Grid is full: keep the nearest cell rather than dropping the icon.
    return cellPosition(want, grid);
}
