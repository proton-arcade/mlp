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

import type { IMixtClientRegistry } from './clients/types';
import type { IMixtControllerRegistry } from './controllers/types';
import type { IMixtDriverRegistry } from './drivers/types';
import type { IMixtServiceRegistry } from './services/types';
import type { IMixtStoreRegistry } from './stores/types';
import type { IConfig, LayerInstances } from './types';

export const configContainer: IConfig = {} as IConfig;

export const clientsContainers: LayerInstances<IMixtClientRegistry> = {};
export const storesContainers: LayerInstances<IMixtStoreRegistry> = {};
export const servicesContainers: LayerInstances<IMixtServiceRegistry> = {};
export const controllersContainers: LayerInstances<IMixtControllerRegistry> =
    {};
export const driversContainers: LayerInstances<IMixtDriverRegistry> = {};
