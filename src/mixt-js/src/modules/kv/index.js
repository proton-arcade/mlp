import { MixtModule } from '../../lib/MixtModule.js';
import { add } from './add.js';
import { decr } from './decr.js';
import { del } from './del.js';
import { expire } from './expire.js';
import { expireAt } from './expireAt.js';
import { flush } from './flush.js';
import { get } from './get.js';
import { incr } from './incr.js';
import { GuiBootCache } from './lib/guiCache.js';
import { MAX_KEY_SIZE, MAX_VALUE_SIZE } from './lib/validate.js';
import { list } from './list.js';
import { remove } from './remove.js';
import { set } from './set.js';
import { update } from './update.js';

/** @typedef {import('../../index.js').Mixt} Mixt */

/**
 * The key-value store. Each app has its own private store within each user's
 * account; apps cannot access other apps' stores.
 *
 * Method implementations live in the sibling files as `this`-context
 * functions whose JSDoc (including the per-form `@overload` declarations) is
 * the source of truth for the public signatures — `types/` is generated from
 * it, never edited by hand.
 */
export class KVModule extends MixtModule {
    /** @type {GuiBootCache} */
    guiCache;

    /**
     * The maximum allowed key size, in UTF-8 bytes (`1 KB`).
     *
     * @readonly
     */
    MAX_KEY_SIZE = MAX_KEY_SIZE;

    /**
     * The maximum allowed value size, in UTF-8 bytes of the value's JSON
     * encoding (`400 KB`).
     *
     * @readonly
     */
    MAX_VALUE_SIZE = MAX_VALUE_SIZE;

    // The fields hold the unbound functions so they keep the full overloaded
    // types (`bind` erases overloads); the constructor rebinds them at
    // runtime so destructured calls (`const { get } = mixt.kv`) keep
    // working like the old arrow fields did.
    set = set;
    get = get;
    del = del;
    incr = incr;
    decr = decr;
    add = add;
    remove = remove;
    update = update;
    expire = expire;
    expireAt = expireAt;
    list = list;
    flush = flush;
    /** Alias of {@link flush}. */
    clear = flush;

    /** @param {Mixt} mixt */
    constructor (mixt) {
        super(mixt);
        this.guiCache = new GuiBootCache(mixt);

        const methods = /** @type {Record<string, (...args: unknown[]) => unknown>} */ (
            /** @type {unknown} */ (this)
        );
        for ( const name of [
            'set', 'get', 'del', 'incr', 'decr', 'add', 'remove',
            'update', 'expire', 'expireAt', 'list', 'flush',
        ] ) {
            methods[name] = methods[name].bind(this);
        }
        // The same bound function, so `mixt.kv.clear === mixt.kv.flush`
        // keeps holding like it did when clear was assigned from flush.
        this.clear = this.flush;
    }
}

/**
 * The public face of the module: derived from the class, with the internal
 * `mixt` handle, the GUI boot cache, and the legacy `authToken` accessor
 * omitted.
 *
 * @typedef {import('../../lib/types.js').OmitMembers<
 *     typeof KVModule,
 *     'mixt' | 'guiCache' | 'authToken'
 * >} KVConstructor
 */

export const KV = /** @type {KVConstructor} */ (KVModule);
