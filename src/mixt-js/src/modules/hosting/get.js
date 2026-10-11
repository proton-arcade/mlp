import * as utils from '../../lib/utils.js';
import { normalizeSubdomain } from './lib/args.js';

/** @typedef {import('./types.js').Subdomain} Subdomain */

/**
 * Retrieves a subdomain by name. Rejects if the subdomain does not exist.
 *
 * @this {import('./index.js').HostingModule}
 * @param {string} subdomain
 * @returns {Promise<Subdomain>}
 */
export async function get (subdomain) {
    const { mixt } = this;

    const options = typeof subdomain === 'string'
        ? { id: { subdomain: normalizeSubdomain(subdomain) } }
        : {};

    return await utils.makeDriverMethod({ iface: 'mixt-subdomains', method: 'read', argNames: ['uid'], mixt, readonly: true })(options);
}
