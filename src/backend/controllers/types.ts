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

import type { mixtClients } from '../clients';
import type { IExtensionClientInstances } from '../clients/types';
import type { MixtRouter } from '../core/http/MixtRouter';
import type { mixtDrivers } from '../drivers';
import type { IExtensionDriverInstances } from '../drivers/types';
import type { mixtServices } from '../services';
import type { IExtensionServiceInstances } from '../services/types';
import type { mixtStores } from '../stores';
import type { IExtensionStoreInstances } from '../stores/types';
import type {
    IConfig,
    LayerInstances,
    WithControllerRegistration,
} from '../types';

/** Extension-augmentable controller registry; see `IExtensionClientInstances`. */
export interface IExtensionControllerInstances {
    [key: string]: unknown;
}

export type IMixtController<
    T extends WithControllerRegistration = WithControllerRegistration,
> = new (
    config: IConfig,
    clients: LayerInstances<typeof mixtClients> & IExtensionClientInstances,
    stores: LayerInstances<typeof mixtStores> & IExtensionStoreInstances,
    services: LayerInstances<typeof mixtServices> & IExtensionServiceInstances,
    drivers: LayerInstances<typeof mixtDrivers> & IExtensionDriverInstances,
) => T;

/**
 * Base class for controllers. Override `registerRoutes(router)` or use the
 * `@Controller` / `@Post` decorators, which install a default one.
 */
export const MixtController =
    class MixtController implements WithControllerRegistration {
        constructor(
            protected config: IConfig,
            protected clients: LayerInstances<typeof mixtClients> &
                IExtensionClientInstances,
            protected stores: LayerInstances<typeof mixtStores> &
                IExtensionStoreInstances,
            protected services: LayerInstances<typeof mixtServices> &
                IExtensionServiceInstances,
            protected drivers: LayerInstances<typeof mixtDrivers> &
                IExtensionDriverInstances,
        ) {}
        public onServerStart() {
            return;
        }
        public onServerPrepareShutdown() {
            return;
        }
        public onServerShutdown() {
            return;
        }
        public getReportedCosts():
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            | Promise<Record<string, any>[]>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            | Record<string, any>[] {
            return [];
        }
        public registerRoutes(_router: MixtRouter) {}
    } satisfies IMixtController<WithControllerRegistration>;

export type IMixtControllerRegistry = Record<
    string,
    | IMixtController<WithControllerRegistration>
    | (InstanceType<IMixtController<WithControllerRegistration>> &
          Record<string, unknown>)
>;
