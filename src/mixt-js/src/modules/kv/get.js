import * as utils from '../../lib/utils.js';
import { isObject, parseOptConfigThenCallbacks } from './lib/args.js';
import { assertKeyPresent, assertKeySize } from './lib/validate.js';

/** @typedef {import('./types.js').KVOptConfig} KVOptConfig */

const getDriverCall = (mixt, args) =>
    utils.makeDriverMethod({
        iface: 'mixt-kvstore',
        method: 'get',
        argNames: ['key'],
        mixt,
        readonly: true,
        preprocess: (driverArgs) => {
            assertKeyPresent(driverArgs.key);
            assertKeySize(driverArgs.key);
            return driverArgs;
        },
    })(args);

/**
 * @template [T = unknown]
 * @overload
 * @param {string} key
 * @param {KVOptConfig} [optConfig]
 * @returns {Promise<T | null>}
 */
/**
 * Returns the key's value, or `null` if the key does not exist or has expired.
 *
 * Also accepts the object form `get({ key, optConfig })` and legacy trailing
 * success/error callbacks.
 *
 * @this {import('./index.js').KVModule}
 * @param {string | { key: string, optConfig?: KVOptConfig }} keyOrObject
 * @param {...(KVOptConfig | Function | undefined)} rest
 * @returns {Promise<unknown>}
 */
export async function get (keyOrObject, ...rest) {
    const { mixt } = this;

    if ( isObject(keyOrObject) && rest.length === 0 ) {
        return await getDriverCall(mixt, keyOrObject);
    }

    const key = keyOrObject;
    const { optConfig, success, error } = parseOptConfigThenCallbacks(rest);

    // The GUI's boot-time reads are served from one batched request; a batch
    // that failed or came back malformed falls through to the call below.
    if ( !optConfig && this.guiCache.serves(key) ) {
        const cached = await this.guiCache.lookup(/** @type {string} */ (key));
        if ( cached.hit ) return cached.value;
    }

    return await getDriverCall(mixt, { key, optConfig, success, error });
}
