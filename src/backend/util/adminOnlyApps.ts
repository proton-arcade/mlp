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
 * Built-in apps that only the administrator may see or launch. Dev Center has
 * `godmode` (broad file access), so ordinary accounts must not get it in their
 * taskbar, launch grid, or recent list.
 */
export const ADMIN_ONLY_APP_NAMES: ReadonlySet<string> = new Set([
    'dev-center',
    'admin-vault',
]);

export const ADMIN_USERNAME = 'admin';

/** True when `user` may see or launch the app called `appName`. */
export function isAppVisibleTo(
    appName: string | null | undefined,
    user: { username?: string | null } | null | undefined,
): boolean {
    if (!appName || !ADMIN_ONLY_APP_NAMES.has(appName)) return true;
    return user?.username === ADMIN_USERNAME;
}
