/**
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

import { describe, expect, it } from 'vitest';
import { subdomainOffsetForDomain } from './subdomains.ts';

describe('subdomainOffsetForDomain', () => {
    it('keeps express default for a two-label root domain', () => {
        expect(subdomainOffsetForDomain('mixt.mpl')).toBe(2);
    });

    it('counts the single label of a plain localhost root domain', () => {
        expect(subdomainOffsetForDomain('localhost')).toBe(1);
    });

    it('counts every label of a deeper root domain', () => {
        expect(subdomainOffsetForDomain('mixt.example.com')).toBe(3);
        expect(subdomainOffsetForDomain('mixt.eu.example.co.uk')).toBe(5);
    });

    it('counts a single-label root domain as one', () => {
        expect(subdomainOffsetForDomain('localhost')).toBe(1);
    });

    it('ignores casing, surrounding space, port and a leading dot', () => {
        expect(subdomainOffsetForDomain('  Mixt.Example.COM  ')).toBe(3);
        expect(subdomainOffsetForDomain('mixt.example.com:4100')).toBe(3);
        expect(subdomainOffsetForDomain('.mixt.example.com')).toBe(3);
    });

    it('falls back to the express default when no domain is configured', () => {
        expect(subdomainOffsetForDomain(undefined)).toBe(2);
        expect(subdomainOffsetForDomain(null)).toBe(2);
        expect(subdomainOffsetForDomain('')).toBe(2);
        expect(subdomainOffsetForDomain('   ')).toBe(2);
    });
});
