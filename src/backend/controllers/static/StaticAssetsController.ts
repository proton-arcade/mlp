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

import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { MixtController } from '../types.js';
import type { MixtRouter } from '../../core/http/MixtRouter';

/**
 * Static asset routes.
 *
 * /mixt.js/v1, /mixt.js/v2 → any subdomain /v1, /v2, /putility/v1 → js
 * subdomain /sdk/* → root subdomain — mixt-js bundle /dist/_, /src/_,
 * /assets/* → root subdomain
 *
 * Each block depends on its config root (`client_libs_root`, `gui_assets_root`,
 * `mixtjs_root`). When unset, that block is skipped — deployments that don't
 * ship the libs or the GUI just don't get those routes.
 */
export class StaticAssetsController extends MixtController {
    registerRoutes(router: MixtRouter) {
        if (this.config.client_libs_root) {
            const root = this.config.client_libs_root;

            router.get('/mixt.js/v1', { subdomain: '*' }, (_req, res) => {
                res.sendFile('mixt.js/v1.js', { root });
            });
            router.get('/mixt.js/v2', { subdomain: '*' }, (_req, res) => {
                res.sendFile('mixt.js/v2.js', { root });
            });

            router.get('/v1', { subdomain: 'js' }, (_req, res) => {
                res.sendFile('mixt.js/v1.js', { root });
            });
            router.get('/v2', { subdomain: 'js' }, (_req, res) => {
                res.sendFile('mixt.js/v2.js', { root });
            });
            router.get('/putility/v1', { subdomain: 'js' }, (_req, res) => {
                res.sendFile('putility.js/v1.js', { root });
            });
        }

        // mixt-js SDK mount. GUI loads it at `/sdk/mixt.dev.js`; the
        // webpack dev build writes that filename, but the OSS repo ships
        // `mixt.js` (minified) as the built artifact. Fall back to
        // `mixt.js` when `.dev.js` isn't present so `yarn start` works
        // out of the box without running the dev-mode webpack build.
        const mixtjsRoot = this.config.mixtjs_root;
        if (mixtjsRoot) {
            const hasDev = existsSync(path.join(mixtjsRoot, 'mixt.dev.js'));
            if (!hasDev && existsSync(path.join(mixtjsRoot, 'mixt.js'))) {
                router.get(
                    '/sdk/mixt.dev.js',
                    { subdomain: '' },
                    (_req, res) => {
                        res.sendFile('mixt.js', { root: mixtjsRoot });
                    },
                );
            }
            router.use('/sdk', { subdomain: '' }, express.static(mixtjsRoot));

            // Third-party apps (dev-center, emulator, …) load mixt-js via
            // `/mixt.js/v{1,2}` — a self-contained single-file endpoint.
            // When `client_libs_root` is configured the block above already
            // owns these routes and wins by registration order; skip to
            // avoid a noisy double-mount.
            if (!this.config.client_libs_root) {
                const mixtJsFile = hasDev ? 'mixt.dev.js' : 'mixt.js';
                router.get('/mixt.js/v1', { subdomain: '*' }, (_req, res) => {
                    res.sendFile(mixtJsFile, { root: mixtjsRoot });
                });
                router.get('/mixt.js/v2', { subdomain: '*' }, (_req, res) => {
                    res.sendFile(mixtJsFile, { root: mixtjsRoot });
                });
                // The GUI loads the SDK from `/mixt.js/v2` on this server. Older
                // builds hard-coded `https://js.mixt.mpl/v{1,2}`; the bare `/v1`
                // and `/v2` paths on the `js` subdomain keep those working when
                // `js.mixt.mpl` is pointed at this instance. Serve the same file.
                router.get('/v1', { subdomain: 'js' }, (_req, res) => {
                    res.sendFile(mixtJsFile, { root: mixtjsRoot });
                });
                router.get('/v2', { subdomain: 'js' }, (_req, res) => {
                    res.sendFile(mixtJsFile, { root: mixtjsRoot });
                });
            }
        }

        if (this.config.gui_assets_root) {
            const root = this.config.gui_assets_root;

            router.use(
                '/dist',
                { subdomain: '' },
                express.static(path.join(root, 'dist')),
            );
            router.use(
                '/src',
                { subdomain: '' },
                express.static(path.join(root, 'src')),
            );

            const publicDir = path.join(root, 'public');
            if (existsSync(publicDir)) {
                router.use(
                    '/assets',
                    { subdomain: '' },
                    express.static(publicDir),
                );
            }
        }

        // Built-in app mounts. The seed SQL ships apps with
        // `index_url: https://builtins.namespaces.mixt.mpl/<name>`, and
        // `launch_app` rewrites that prefix to `${gui_origin}/builtin/<name>`.
        // Without these static mounts the iframe loads from our own origin
        // and hits the 404 handler. `builtin_apps` maps each wire name to
        // the directory we serve it from.
        const builtinApps = this.config.builtin_apps;
        if (builtinApps) {
            for (const [name, dirPath] of Object.entries(builtinApps)) {
                if (!dirPath || !existsSync(dirPath)) continue;
                router.use(
                    `/builtin/${name}`,
                    { subdomain: '' },
                    express.static(dirPath),
                );
            }
        }
    }
}
