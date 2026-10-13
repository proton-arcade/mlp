import { MixtModule } from '../../lib/MixtModule.js';
import { checkName } from './checkName.js';
import { create } from './create.js';
import { del } from './delete.js';
import { get } from './get.js';
import { getDeveloperProfile } from './getDeveloperProfile.js';
import { list } from './list.js';
import { update } from './update.js';

/** @typedef {import('../../index.js').Mixt} Mixt */

/**
 * The `mixt.apps` module.
 *
 * Method implementations live in the sibling files as `this`-context
 * functions whose JSDoc (including the per-form `@overload` declarations) is
 * the source of truth for the public signatures — `types/` is generated from
 * it, never edited by hand.
 */
export class AppsModule extends MixtModule {
    // The fields hold the unbound functions so they keep the full overloaded
    // types (`bind` erases overloads); the constructor rebinds them at runtime
    // so destructured calls (`const { create } = mixt.apps`) keep working.
    list = list;
    create = create;
    update = update;
    get = get;
    delete = del;
    checkName = checkName;
    getDeveloperProfile = getDeveloperProfile;

    /** @param {Mixt} mixt */
    constructor (mixt) {
        super(mixt);

        const methods = /** @type {Record<string, (...args: unknown[]) => unknown>} */ (
            /** @type {unknown} */ (this)
        );
        for ( const name of ['list', 'create', 'update', 'get', 'delete', 'checkName', 'getDeveloperProfile'] ) {
            methods[name] = methods[name].bind(this);
        }
    }
}

/**
 * The public face of the module: derived from the class, with the internal
 * `mixt` handle and the legacy `authToken` accessor omitted, plus
 * `getDeveloperProfile`, which only an account's own session can call.
 *
 * @typedef {import('../../lib/types.js').OmitMembers<
 *     typeof AppsModule,
 *     'mixt' | 'authToken'
 *     | 'getDeveloperProfile'
 * >} AppsConstructor
 */

export const Apps = /** @type {AppsConstructor} */ (AppsModule);

export default Apps;
