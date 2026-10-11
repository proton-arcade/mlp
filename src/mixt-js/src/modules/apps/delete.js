import * as utils from '../../lib/utils.js';

/**
 * Deletes the app with the given name. Resolves to `{ success: true, uid }`
 * with the `uid` of the deleted app.
 *
 * @this {import('./index.js').AppsModule}
 * @param {string} name
 * @returns {Promise<{ success: boolean, uid: string }>}
 */
export async function del (name) {
    const { mixt } = this;

    const options = typeof name === 'string' ? { id: { name } } : {};
    return await utils.makeDriverMethod({ iface: 'mixt-apps', driver: 'es:app', method: 'delete', argNames: ['uid'], mixt })(options);
}
