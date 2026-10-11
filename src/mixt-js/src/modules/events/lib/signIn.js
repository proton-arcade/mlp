import { MixtJSError } from '../../../lib/MixtJSError.js';

/**
 * Whether this call has to sign the visitor in first.
 * @param {import('../../../index.js').Mixt} mixt
 * @returns {boolean}
 */
export const needsSignIn = (mixt) => ! mixt.authToken && mixt.env === 'web';

/**
 * Opens the sign-in flow other `mixt.*` calls use.
 * @param {import('../../../index.js').Mixt} mixt
 * @returns {Promise<void>}
 */
export const signInVisitor = async (mixt) => {
    try {
        await mixt.ui.authenticateWithMixt();
    } catch {
        throw new MixtJSError('Authentication canceled', 'auth_canceled');
    }
};
