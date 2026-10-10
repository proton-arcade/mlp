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

import { describe, expect, it } from 'vitest';
import type { UserStore } from '../stores/user/UserStore';
import {
    isServerUserAllowed,
    readWhitelist,
    whitelistUsernameProblem,
    withWhitelistLock,
    writeWhitelist,
} from './serverWhitelist';

/** The one store method the whitelist uses, backed by a plain map. */
const fakeUsers = (): UserStore => {
    const rows = new Map<string, { id: number; username: string; metadata: Record<string, unknown> }>();
    rows.set('admin', { id: 1, username: 'admin', metadata: {} });
    const store = {
        getByUsername: async (username: string) => rows.get(username) ?? null,
        updateMetadata: async (id: number, patch: Record<string, unknown>) => {
            const row = [...rows.values()].find((r) => r.id === id);
            if (!row) throw new Error('no such user');
            row.metadata = { ...row.metadata, ...patch };
        },
    };
    return store as unknown as UserStore;
};

describe('whitelistUsernameProblem', () => {
    it('accepts plain word-character usernames', () => {
        expect(whitelistUsernameProblem('alice_01')).toBeNull();
    });

    it('rejects characters outside letters, digits and underscore', () => {
        expect(whitelistUsernameProblem('al ice')).toMatch(/only contain/);
        expect(whitelistUsernameProblem('a.b')).toMatch(/only contain/);
        expect(whitelistUsernameProblem('')).toMatch(/only contain/);
    });

    it('rejects names longer than the maximum', () => {
        expect(whitelistUsernameProblem('a'.repeat(46))).toMatch(/at most 45/);
        expect(whitelistUsernameProblem('a'.repeat(45))).toBeNull();
    });

    it('rejects reserved usernames such as the administrator', () => {
        expect(whitelistUsernameProblem('admin')).toBe('That username is reserved.');
    });
});

describe('isServerUserAllowed', () => {
    it('always admits the administrator, in any letter case', async () => {
        const users = fakeUsers();
        expect(await isServerUserAllowed(users, 'admin')).toBe(true);
        expect(await isServerUserAllowed(users, 'Admin')).toBe(true);
    });

    it('denies an account that is not whitelisted', async () => {
        expect(await isServerUserAllowed(fakeUsers(), 'mallory')).toBe(false);
        expect(await isServerUserAllowed(fakeUsers(), '')).toBe(false);
        expect(await isServerUserAllowed(fakeUsers(), undefined)).toBe(false);
    });

    it('admits a whitelisted account and revokes it when removed', async () => {
        const users = fakeUsers();
        await writeWhitelist(users, [
            { username: 'alice', added_by: 'admin', added_at: '2026-10-10T00:00:00Z' },
        ]);
        expect(await isServerUserAllowed(users, 'alice')).toBe(true);
        expect(await isServerUserAllowed(users, 'ALICE')).toBe(true);

        await writeWhitelist(users, []);
        expect(await isServerUserAllowed(users, 'alice')).toBe(false);
    });

    it('stores the list on the administrator row and reads it back', async () => {
        const users = fakeUsers();
        await writeWhitelist(users, [
            { username: 'Bob', added_by: 'admin', added_at: 'x' },
        ]);
        const entries = await readWhitelist(users);
        expect(entries).toEqual([{ username: 'bob', added_by: 'admin', added_at: 'x' }]);
    });

    it('keeps every entry when admin changes race', async () => {
        const users = fakeUsers();
        const add = (name: string) =>
            withWhitelistLock(async () => {
                const entries = await readWhitelist(users);
                // Yield between read and write so an unlocked version would lose entries.
                await new Promise((r) => setTimeout(r, 1));
                await writeWhitelist(users, [
                    ...entries,
                    { username: name, added_by: 'admin', added_at: 'x' },
                ]);
            });
        await Promise.all(['a1', 'b2', 'c3', 'd4', 'e5'].map(add));
        const names = (await readWhitelist(users)).map((e) => e.username).sort();
        expect(names).toEqual(['a1', 'b2', 'c3', 'd4', 'e5']);
    });
});
