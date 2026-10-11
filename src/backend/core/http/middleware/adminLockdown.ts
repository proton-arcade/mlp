/*
 * Server lockdown: only the administrator and whitelisted users may use this
 * server.
 *
 * Runs on every request after the auth probe has populated `req.actor`:
 *
 *   - Anonymous visitors may load the desktop itself (the page and its static
 *     GUI assets on the main domain) and use the sign-in endpoints. Everything
 *     else, including hosted sites and public links, answers 401.
 *   - A signed-in account must be the `admin` account or on the whitelist.
 *     Anyone else may only sign out; everything else answers 403.
 *   - Allowed accounts pass through to the normal per-route checks.
 *
 * Installed before the hosted-site middleware, so user-published sites are
 * closed to everyone who is not allowed in as well.
 */

import type { Request, RequestHandler } from 'express';
import { HttpError } from '../HttpError';
import { rejectAuth } from './gates';
import type { UserStore } from '../../../stores/user/UserStore';
import { isServerUserAllowed } from '../../../util/serverWhitelist';

import '../expressAugmentation';

/** Main-domain GET paths that serve the desktop shell and its assets. */
const GUI_EXACT_PATHS = new Set([
    '/',
    '/index.html',
    '/favicon.ico',
    '/dashboard',
]);
const GUI_PATH_PREFIXES = [
    '/sdk/',
    '/dist/',
    '/src/',
    '/css/',
    '/images/',
    '/fonts/',
    '/js/',
    '/app/',
    // Built-in apps and the internet folder (MPLmit) are static files from the
    // repository. Nothing private is served under this prefix.
    '/builtin/',
];

/** Sign-in endpoints a visitor needs before they have a session. */
const SIGN_IN_PATHS = new Set([
    '/login',
    '/login/wait',
    '/login/set',
    '/login/otp',
    '/login/recovery-code',
]);

const isGuiRequest = (req: Request): boolean => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const sub = req.subdomains?.[req.subdomains.length - 1] ?? '';
    if (sub !== '') return false;
    return (
        GUI_EXACT_PATHS.has(req.path) ||
        GUI_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix))
    );
};

// App icons are <img> targets on the api subdomain. Browsers do not send the
// session token with image requests, so they must be readable without one.
// Icons are public app artwork; the route keeps its own rate limit and headers.
const isPublicIconRequest = (req: Request): boolean => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const sub = req.subdomains?.[req.subdomains.length - 1] ?? '';
    return sub === 'api' && req.path.startsWith('/app-icon/');
};

const isSignInRequest = (req: Request): boolean =>
    req.method === 'POST' && SIGN_IN_PATHS.has(req.path);

const isSignOutRequest = (req: Request): boolean =>
    req.method === 'POST' && req.path === '/logout';

export const createAdminLockdown = (users: UserStore): RequestHandler => {
    return async (req, _res, next) => {
        try {
            if (isGuiRequest(req) || isSignInRequest(req) || isPublicIconRequest(req)) {
                next();
                return;
            }

            const user = req.actor?.user;
            if (!user) {
                // Same answer the route gates give: a revoked or expired
                // session gets `reauth_required` so the desktop can prompt
                // again, and a bad token gets `token_auth_failed`.
                next(rejectAuth(req));
                return;
            }

            if (isSignOutRequest(req)) {
                next();
                return;
            }

            if (!(await isServerUserAllowed(users, user.username))) {
                next(
                    new HttpError(
                        403,
                        'Your account is not allowed to use this server.',
                        { legacyCode: 'forbidden' },
                    ),
                );
                return;
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};
