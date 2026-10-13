import { driverCallEnvelope, fetchUrl } from '../lib/networkUtils.js';

/**
 * A driver interface bound to an SDK instance, as returned by
 * `mixt.drivers.get()`. Calls resolve the response envelope rather than the
 * unwrapped result — see `driverCallEnvelope`.
 */
export class Driver {
    /**
     * @param {import('../index.js').Mixt} mixt
     * @param {string} ifaceName
     */
    constructor (mixt, ifaceName) {
        this.mixt = mixt;
        this.iface_name = ifaceName;
    }

    /**
     * @param {string} methodName
     * @param {Record<string, unknown>} [parameters]
     * @returns {Promise<unknown>}
     */
    async call (methodName, parameters) {
        return await driverCallEnvelope({
            mixt: this.mixt,
            iface: this.iface_name,
            method: methodName,
            args: parameters,
        });
    }
}

/**
 * The `mixt.drivers` module: call driver interfaces directly.
 */
export class DriversModule {
    /** @param {import('../index.js').Mixt} mixt */
    constructor (mixt) {
        this.mixt = mixt;
        this.drivers_ = {};
    }

    _init ({ mixt }) {
        mixt.call = this.call.bind(this);
    }

    /** @returns {Promise<Record<string, unknown>>} */
    async list () {
        const resp = await fetchUrl(`${this.mixt.APIOrigin}/lsmod`, {
            method: 'POST',
            includeMixtAuth: true,
            logContext: { service: 'drivers', operation: 'list', params: {} },
        });
        const list = await resp.json();
        return list.interfaces;
    }

    /**
     * Returns a handle for an interface. Cached per interface, so repeated
     * `get()` calls hand back the same object.
     *
     * @param {string} ifaceName
     * @returns {Promise<Driver>}
     */
    async get (ifaceName) {
        return this.drivers_[ifaceName] ??= new Driver(this.mixt, ifaceName);
    }

    /**
     * Calls a driver method. The interface resolves to its default
     * implementation on the backend, and a method with the same name as its
     * interface can be left out:
     *
     *   mixt.drivers.call('ipgeo', { ip: '1.2.3.4' })
     *
     * is the same as:
     *
     *   mixt.drivers.call('ipgeo', 'ipgeo', { ip: '1.2.3.4' })
     *
     * @param {...unknown} args `(iface, method, parameters)`, or `(iface,
     *   parameters)` for the method named after its interface.
     * @returns {Promise<unknown>}
     */
    async call (...args) {
        let ifaceName, methodName, parameters;

        if ( args.length >= 4 ) {
            // (iface, implementation, method, parameters) — the implementation
            // slot predates interface-level defaults and is resolved by the
            // backend, so it is accepted and ignored.
            ([ifaceName, , methodName, parameters] = args);
        } else if ( args.length === 3 ) {
            ([ifaceName, methodName, parameters] = args);
        } else {
            ([ifaceName, parameters] = args);
            methodName = ifaceName;
        }

        const driver = await this.get(ifaceName);
        return await driver.call(methodName, parameters);
    }
}

/**
 * The public face of the module: derived from the class, with the internal
 * `mixt` handle and the driver cache omitted.
 *
 * @typedef {import('../lib/types.js').OmitMembers<
 *     typeof DriversModule,
 *     'mixt' | 'drivers_' | '_init'
 * >} DriversConstructor
 */

export const Drivers = /** @type {DriversConstructor} */ (DriversModule);

export default Drivers;
