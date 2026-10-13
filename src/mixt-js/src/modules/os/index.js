import { MixtModule } from '../../lib/MixtModule.js';
import { user } from './user.js';
import { version } from './version.js';

/** @typedef {import('../../index.js').Mixt} Mixt */

/**
 * The `mixt.os` module.
 *
 * Method implementations live in the sibling files as `this`-context
 * functions whose JSDoc is the source of truth for the public signatures —
 * `types/` is generated from it, never edited by hand.
 */
export class OSModule extends MixtModule {
    user = user;
    version = version;

    /** @param {Mixt} mixt */
    constructor (mixt) {
        super(mixt);

        const methods = /** @type {Record<string, (...args: unknown[]) => unknown>} */ (
            /** @type {unknown} */ (this)
        );
        for ( const name of ['user', 'version'] ) {
            methods[name] = methods[name].bind(this);
        }
    }
}

/**
 * The public face of the module: derived from the class, with the internal
 * `mixt` handle and the legacy `authToken` accessor omitted.
 *
 * @typedef {import('../../lib/types.js').OmitMembers<
 *     typeof OSModule,
 *     'mixt' | 'authToken'
 * >} OSConstructor
 */

export const OS = /** @type {OSConstructor} */ (OSModule);

export default OS;
