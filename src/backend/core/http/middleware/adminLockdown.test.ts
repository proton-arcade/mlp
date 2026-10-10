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
import type { UserStore } from '../../../stores/user/UserStore';
import { writeWhitelist } from '../../../util/serverWhitelist';
import { createAdminLockdown } from './adminLockdown';

const fakeUsers = (): UserStore => {
    const rows = new Map<string, { id: number; username: string; metadata: Record<string, unknown> }>();
    rows.set('admin', { id: 1, username: 'admin', metadata: {} });
    return {
        getByUsername: async (u: string) => rows.get(u) ?? null,
        updateMetadata: async (id: number, patch: Record<string, unknown>) => {
            const row = [...rows.values()].find((r) => r.id === id)!;
            row.metadata = { ...row.metadata, ...patch };
        },
    } as unknown as UserStore;
};

type Outcome = { status?: number; legacyCode?: string; passed: boolean };

/** Run the lockdown for one request and report how it ended. */
const run = async (
    users: UserStore,
    req: { method: string; path: string; username?: string; anonymous?: boolean; subdomain?: string },
): Promise<Outcome> => {
    const handler = createAdminLockdown(users);
    const request = {
        method: req.method,
        path: req.path,
        subdomains: req.subdomain ? [req.subdomain] : [],
        actor: req.anonymous ? undefined : { user: { username: req.username ?? 'mallory' } },
    };
    return new Promise((resolve) => {
        handler(request as never, {} as never, (err?: unknown) => {
            if (!err) return resolve({ passed: true });
            const e = err as { statusCode?: number; legacyCode?: string };
            resolve({ passed: false, status: e.statusCode, legacyCode: e.legacyCode });
        });
    });
};

describe('admin lockdown', () => {
    it('lets anonymous visitors load the desktop and sign in', async () => {
        const users = fakeUsers();
        expect((await run(users, { method: 'GET', path: '/', anonymous: true })).passed).toBe(true);
        expect((await run(users, { method: 'POST', path: '/login', anonymous: true })).passed).toBe(true);
    });

    it('answers 401 to an anonymous request for anything else', async () => {
        const out = await run(fakeUsers(), { method: 'GET', path: '/whoami', anonymous: true });
        expect(out).toEqual({ passed: false, status: 401, legacyCode: 'token_missing' });
    });

    it('answers 403 to a signed-in account that is not allowed', async () => {
        const out = await run(fakeUsers(), { method: 'GET', path: '/whoami', username: 'mallory' });
        expect(out).toEqual({ passed: false, status: 403, legacyCode: 'forbidden' });
    });

    it('still lets a non-whitelisted account sign out', async () => {
        const out = await run(fakeUsers(), { method: 'POST', path: '/logout', username: 'mallory' });
        expect(out.passed).toBe(true);
    });

    it('admits the administrator', async () => {
        const out = await run(fakeUsers(), { method: 'GET', path: '/whoami', username: 'admin' });
        expect(out.passed).toBe(true);
    });

    it('admits a whitelisted account and blocks it again once removed', async () => {
        const users = fakeUsers();
        await writeWhitelist(users, [{ username: 'alice', added_by: 'admin', added_at: 'x' }]);
        expect((await run(users, { method: 'GET', path: '/whoami', username: 'alice' })).passed).toBe(true);

        await writeWhitelist(users, []);
        const out = await run(users, { method: 'GET', path: '/whoami', username: 'alice' });
        expect(out.status).toBe(403);
    });
});
