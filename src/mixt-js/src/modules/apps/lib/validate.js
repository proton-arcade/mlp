import { MixtJSError } from '../../../lib/MixtJSError.js';

// mixt.apps has always thrown a nested `{ success: false, error: { code,
// message } }` for client-side validation failures. MixtJSError keeps that
// exact shape (via the extra fields) while also exposing top-level
// `message`/`code`, so both `err.error.code` and `err.code` keep working.

/**
 * @param {string} message
 * @returns {MixtJSError}
 */
export const invalidRequest = (message) =>
    new MixtJSError(message, 'invalid_request', {
        success: false,
        error: { code: 'invalid_request', message },
    });
