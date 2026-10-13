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
import crypto from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { MixtService } from '../types.js';
import type { UserRow } from '../../stores/user/UserStore.js';
import { generateDefaultFsentries } from '../../util/userProvisioning.js';
import { LOCAL_UNLIMITED_USER } from '../../data/subPolicies/localUnlimitedUserPolicy.js';
import { UNLIMITED_SUBSCRIPTION } from '../metering/consts.js';

const USERNAME = 'admin';
export const ADMIN_GROUP_UID = 'ca342a5e-b13d-4dee-9048-58b11a57cc55';
const ADMIN_STORAGE_BYTES = 10 * 1024 * 1024 * 1024;

/** File name inside `config.admin_dir` that holds the administrator password. */
export const ADMIN_PASSWORD_FILE = 'admin.json';

/**
 * Reads the administrator password from `<dir>/admin.json`.
 * Returns null when the file is missing or holds no password.
 */
export const readAdminPasswordFile = (file: string): string | null => {
    if (!existsSync(file)) return null;
    let parsed: unknown;
    try {
        parsed = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
        throw new Error(
            `${file} is not valid JSON (${(e as Error).message}). ` +
                'Fix it, or run `node admin/set-password.mjs <new password>`.',
        );
    }
    const password = (parsed as { password?: unknown })?.password;
    return typeof password === 'string' && password !== '' ? password : null;
};

/** Writes the administrator password file (owner-readable only). */
export const writeAdminPasswordFile = (file: string, password: string): void => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ password }, null, 4) + '\n', {
        mode: 0o600,
    });
};

/**
 * Bootstraps the `admin` user for self-hosted deployments.
 *
 * The administrator's password lives in `<config.admin_dir>/admin.json`
 * (default `admin/admin.json`). On every start the `admin` account is made to
 * match that file, so changing the password is: edit the file (or run
 * `node admin/set-password.mjs <new password>`) and restart the server.
 *
 * If the file does not exist it is created with a random password. An account
 * created by an older version is migrated: its password is kept, and it is
 * written to the file. The plaintext is never stored in the database and is
 * never printed.
 */
export class DefaultUserService extends MixtService {
    override async onServerStart(): Promise<void> {
        // Dev convenience: grant the bootstrap `admin` user unlimited metering.
        // Gated to env === 'dev' so prod deployments never get a free-usage
        // actor. Registering the policy makes its `'unlimited'` id resolvable
        // (extraPolicies is always in the available set); the resolver returns
        // null for everyone else, so all other users keep their normal tier.
        if (this.config.env === 'dev') {
            this.services.metering.registerPolicy(LOCAL_UNLIMITED_USER);
            this.services.metering.registerSubscriptionResolver((actor) =>
                actor.user?.username === USERNAME
                    ? UNLIMITED_SUBSCRIPTION
                    : null,
            );
        }

        if (this.config.no_default_user) return;

        const file = path.join(this.config.admin_dir, ADMIN_PASSWORD_FILE);
        let user = await this.stores.user.getByUsername(USERNAME);

        let password = readAdminPasswordFile(file);
        if (password === null) {
            // Migrate a password stored by an older version, else generate one.
            const stashed = (user?.metadata as Record<string, unknown>)
                ?.tmp_password;
            password =
                typeof stashed === 'string' && stashed !== ''
                    ? stashed
                    : crypto.randomBytes(16).toString('hex');
            writeAdminPasswordFile(file, password);
            console.log(`[admin] wrote the administrator password to ${file}`);
        }

        if (!user) {
            await this.#createAdminUser(password);
            user = await this.stores.user.getByUsername(USERNAME);
        } else {
            const matches = await bcrypt.compare(
                password,
                String(user.password ?? ''),
            );
            if (!matches) {
                await this.stores.user.update(user.id, {
                    password: await bcrypt.hash(password, 8),
                });
                console.log(
                    `[admin] administrator password updated from ${file}`,
                );
            }
        }

        // Older versions kept the plaintext in account metadata. Drop it.
        if (user && (user.metadata as Record<string, unknown>)?.tmp_password) {
            await this.stores.user.updateMetadata(user.id, {
                tmp_password: null,
            });
        }

        console.log(
            `[admin] sign in as "admin". The password is in ${file}; ` +
                'to change it run `node admin/set-password.mjs <new password>` and restart.',
        );
    }

    async #createAdminUser(password: string): Promise<UserRow> {
        const passwordHash = await bcrypt.hash(password, 8);

        const created = await this.stores.user.create({
            username: USERNAME,
            uuid: uuidv4(),
            password: passwordHash,
            email: null,
            free_storage: ADMIN_STORAGE_BYTES,
            requires_email_confirmation: false,
            account_type: 'owner',
        });

        try {
            await this.stores.group.addUsers(ADMIN_GROUP_UID, [USERNAME]);
        } catch (e) {
            console.warn(
                '[default-user] failed to add admin to admin group',
                e,
            );
        }

        try {
            await generateDefaultFsentries(
                this.clients.db,
                this.stores.user,
                created,
            );
        } catch (e) {
            console.warn(
                '[default-user] failed to provision admin home directory',
                e,
            );
        }

        return (await this.stores.user.getById(created.id)) ?? created;
    }
}
