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

import bcrypt from 'bcrypt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    setupMixtTestEnv,
    TEST_ADMIN_CREDENTIALS,
    TEST_USER_CREDENTIALS,
    type MixtTestEnv,
} from '../src/backend/testUtil.js';

// The administrator's password is owned by admin/admin.json and re-applied on
// every start. The Admin API must refuse to change it, while still letting the
// administrator set other accounts' passwords.

describe('admin account password over HTTP', () => {
    let env: MixtTestEnv;
    let elevation = '';

    beforeAll(async () => {
        env = await setupMixtTestEnv();
        const res = await fetch(new URL('/auth/elevate', env.apiOrigin), {
            method: 'POST',
            headers: {
                authorization: `Bearer ${env.users.admin.token}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({ password: TEST_ADMIN_CREDENTIALS.password }),
        });
        expect(res.status).toBe(200);
        elevation = ((await res.json()) as { token: string }).token;
    }, 120_000);

    afterAll(async () => {
        await env?.shutdown();
    });

    const setPassword = (username: string, password: string) =>
        fetch(
            new URL(
                `/admin/accounts/${encodeURIComponent(username)}/password`,
                env.apiOrigin,
            ),
            {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${env.users.admin.token}`,
                    'content-type': 'application/json',
                    'x-mixt-elevation': elevation,
                },
                body: JSON.stringify({ password }),
            },
        );

    it('refuses to change the administrator password and keeps the stored hash', async () => {
        const before = await env.server.stores.user.getByUsername('admin');
        const res = await setPassword('admin', 'a-new-admin-password');

        expect(res.status).toBe(409);
        const body = (await res.json()) as { code: string; message: string };
        expect(body.code).toBe('admin_password_in_file');
        expect(body.message).toContain('admin/admin.json');

        const after = await env.server.stores.user.getByUsername('admin');
        expect(after!.password).toBe(before!.password);
        expect(
            await bcrypt.compare(
                TEST_ADMIN_CREDENTIALS.password,
                String(after!.password),
            ),
        ).toBe(true);
    });

    it('still sets the password of an ordinary account', async () => {
        const res = await setPassword(TEST_USER_CREDENTIALS.username, 'a-new-user-password');

        expect(res.status).toBe(200);
        const after = await env.server.stores.user.getByUsername(
            TEST_USER_CREDENTIALS.username,
        );
        expect(
            await bcrypt.compare('a-new-user-password', String(after!.password)),
        ).toBe(true);
    });
});
