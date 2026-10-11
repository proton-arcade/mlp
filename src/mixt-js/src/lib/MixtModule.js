/** @typedef {import('../index.js').Mixt} Mixt */

/**
 * Base for the `mixt.*` modules. Holds the owning Mixt instance and reads
 * auth state off it live, so a token or origin change is visible everywhere
 * at once and there is nothing to keep in sync.
 *
 * A module that holds a connection open (rather than reading state per call)
 * can subscribe with `mixt.onAuthStateChanged()` to rebuild it.
 */
export class MixtModule {
    /** @param {Mixt} mixt */
    constructor (mixt) {
        /** @type {Mixt} */
        this.mixt = mixt;
    }

    /** @returns {string | null | undefined} */
    get authToken () {
        return this.mixt.authToken;
    }

    /** @returns {string} */
    get APIOrigin () {
        return this.mixt.APIOrigin;
    }

    /** @returns {string | undefined} */
    get appID () {
        return this.mixt.appID;
    }
}
