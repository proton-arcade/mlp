import {
    appsPermission,
    emailPermission,
    subdomainsPermission,
} from './lib/permissionStrings.js';

/** @typedef {import('./index.js').PermsModule} PermsModule */
/** @typedef {import('../../index.js').Mixt} Mixt */
/** @typedef {import('./types.js').PermsAccess} PermsAccess */
/** @typedef {import('./types.js').PermsCreateKind} PermsCreateKind */

/**
 * Ask for a raw permission string, or several under one prompt. Unsupported
 * strings are denied silently. Stays on `mixt.ui`, which owns the IPC.
 *
 * @param {Mixt} mixt
 * @param {string[]} permissions
 * @param {PermsCreateKind} [create] - Forwarded whenever set, `false`
 *   included: the GUI creates by default, so an opt-out has to travel.
 * @returns {Promise<boolean>}
 */
export async function requestPermissions (mixt, permissions, create) {
    // Scalar form for a lone permission: the shape the dialog dedupes on.
    const options = permissions.length === 1
        ? { permission: permissions[0] }
        : { permissions };
    return await mixt.ui.requestPermission(
        create === undefined ? options : { ...options, create },
    );
}

/**
 * @param {Mixt} mixt
 * @param {PermsAccess} access
 * @returns {Promise<boolean>}
 */
async function requestAppsAccess (mixt, access) {
    const whoami = await mixt.auth.whoami();
    return await requestPermissions(mixt, [
        appsPermission(whoami.uuid, access),
    ]);
}

/**
 * @param {Mixt} mixt
 * @param {PermsAccess} access
 * @returns {Promise<boolean>}
 */
async function requestSubdomainsAccess (mixt, access) {
    const whoami = await mixt.auth.whoami();
    return await requestPermissions(mixt, [
        subdomainsPermission(whoami.uuid, access),
    ]);
}

// -- Deprecated aliases --

/**
 * @deprecated Use {@link import('./request.js').request} instead.
 * @this {PermsModule}
 * @param {...unknown} args
 * @returns {Promise<boolean>}
 */
export function requestPermission (...args) {
    return this.request(
        .../** @type {[string, Record<string, unknown> | undefined]} */ (args),
    );
}

/**
 * Request access to the user's email address, returning it when granted.
 *
 * @deprecated Use `request('email')`.
 * @this {PermsModule}
 * @returns {Promise<string | null | undefined>}
 */
export async function requestEmail () {
    let whoami = await this.mixt.auth.whoami();
    // The grant is what puts the field on `whoami`, so it being present at all
    // means the access is already held — `null` included.
    if ( whoami.email !== undefined ) return whoami.email;

    const granted = await this.mixt.ui.requestPermission({
        permission: emailPermission(whoami.uuid),
    });
    if ( granted ) {
        whoami = await this.mixt.auth.whoami();
        return whoami.email;
    }
}

/**
 * @deprecated Use `request('apps')`.
 * @this {PermsModule}
 * @returns {Promise<boolean>}
 */
export function requestReadApps () {
    return requestAppsAccess(this.mixt, 'read');
}

/**
 * @deprecated Use `request('apps', { access: 'write' })`.
 * @this {PermsModule}
 * @returns {Promise<boolean>}
 */
export function requestManageApps () {
    return requestAppsAccess(this.mixt, 'write');
}

/**
 * @deprecated Use `request('subdomains')`.
 * @this {PermsModule}
 * @returns {Promise<boolean>}
 */
export function requestReadSubdomains () {
    return requestSubdomainsAccess(this.mixt, 'read');
}

/**
 * @deprecated Use `request('subdomains', { access: 'write' })`.
 * @this {PermsModule}
 * @returns {Promise<boolean>}
 */
export function requestManageSubdomains () {
    return requestSubdomainsAccess(this.mixt, 'write');
}
