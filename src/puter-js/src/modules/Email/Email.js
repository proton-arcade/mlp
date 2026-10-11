import { PuterModule } from '../../lib/PuterModule.js';
import { get } from './get.js';
import { list } from './list.js';

/** @typedef {import('../../index.js').Puter} Puter */

/**
 * Built-in mailbox reading. Every account has a mailbox. Messages are stored as `message/rfc822` objects under the
 * user's `~/.mail`. `list()` pages through a folder newest first without
 * downloading anything, and `get()` fetches and parses one message. An app
 * needs the `fs:/{username}/.mail:read` permission to read its user's mail.
 */
export class EmailModule extends PuterModule {
    // The fields hold the unbound functions so they keep the full overloaded
    // types (`bind` erases overloads); the constructor rebinds them at runtime
    // so destructured calls (`const { list } = puter.email`) keep working.
    list = list;
    get = get;

    /** @param {Puter} puter */
    constructor (puter) {
        super(puter);

        const methods = /** @type {Record<string, (...args: unknown[]) => unknown>} */ (
            /** @type {unknown} */ (this)
        );
        for ( const name of ['list', 'get'] ) {
            methods[name] = methods[name].bind(this);
        }
    }

}

/**
 * The public face of the module: derived from the class, with the internal
 * `puter` handle and the legacy `authToken` accessor omitted.
 *
 * @typedef {import('../../lib/types.js').OmitMembers<
 *     typeof EmailModule,
 *     'puter' | 'authToken'
 * >} EmailConstructor
 */

export const Email = /** @type {EmailConstructor} */ (EmailModule);

export default Email;
