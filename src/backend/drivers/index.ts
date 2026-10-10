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

import { AppDriver } from './apps/AppDriver.js';
import { KVStoreDriver } from './kv/KVStoreDriver';
import { NotificationDriver } from './notification/NotificationDriver';
import { SubdomainDriver } from './subdomain/SubdomainDriver';
import type { IPuterDriverRegistry } from './types';
import { WorkerDriver } from './workers/WorkerDriver';

export { Driver } from './decorators';
export { resolveDriverMeta } from './meta';

export const puterDrivers = {
    kvStore: KVStoreDriver,
    apps: AppDriver,
    subdomains: SubdomainDriver,
    notifications: NotificationDriver,
    workers: WorkerDriver,
} satisfies IPuterDriverRegistry;
