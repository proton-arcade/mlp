// Shared argument-shape helpers for the mixt.hosting methods.

// A subdomain may be passed either bare (`example`) or as a full hosted host
// (`example.mixt.site` / `example.mixt.mpl`); the latter is accepted so
// copy-pasting a site URL's host just works during development.
const SUBDOMAIN_HOST = /^[a-z0-9]+\.mixt\.(site|com)$/;

/**
 * Returns just the subdomain label, stripping a trailing `.mixt.site` /
 * `.mixt.mpl` when the value is a full hosted host. Non-string or unrelated
 * values pass through unchanged.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export const normalizeSubdomain = (value) =>
    typeof value === 'string' && SUBDOMAIN_HOST.test(value) ? value.split('.')[0] : value;
