// Ambient declarations for the Mixt Workers runtime.
//
// When this file is loaded (via `"types": ["@mixt/worker-types"]` in
// tsconfig.json or `/// <reference types="@mixt/worker-types" />` at the
// top of a .js/.ts file), the worker globals — `router`, `me`, `my`,
// `myself`, `mixt_auth`, `mixt_endpoint` — are visible everywhere with no
// imports required. `me` and its aliases are only assigned once the first
// request is routed, so they are typed for use inside route handlers.

import type { Mixt } from '@mixt/mixt.js';
import type { Router } from './types/router.d.ts';
import type { MixtContext } from './types/event.d.ts';

declare global {
    /**
     * The deployer's Mixt context, authenticated with the worker's own
     * credentials. Available inside route handlers (and code they call); it is
     * not yet defined while the script's top level runs.
     */
    const me: MixtContext;
    /** @deprecated Alias for {@link me}. Will be removed at a future date. */
    const my: MixtContext;
    /** @deprecated Alias for {@link me}. Will be removed at a future date. */
    const myself: MixtContext;

    /** The router used to register HTTP route handlers. */
    const router: Router;

    /** @deprecated The deployer's Mixt auth token, provided as a Cloudflare secret binding. Will be removed at a future date. Use me.mixt.authToken */
    const mixt_auth: string;

    /** @deprecated The Mixt API endpoint, provided as a Cloudflare plaintext binding. Defaults to `https://api.mixt.mpl`. Will be removed at a future date. use me.mixt.APIOrigin */
    const mixt_endpoint: string;
}

export type { Mixt, Router, MixtContext };
