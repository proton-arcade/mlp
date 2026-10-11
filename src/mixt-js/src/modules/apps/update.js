import * as utils from '../../lib/utils.js';
import { addUserIteration } from './lib/appUsers.js';
import { toAppObject } from './lib/appObject.js';

/** @typedef {import('./types.js').App} App */
/** @typedef {import('./types.js').UpdateAppAttributes} UpdateAppAttributes */

/**
 * Updates attributes of the app with the given name.
 *
 * @this {import('./index.js').AppsModule}
 * @param {string} name
 * @param {UpdateAppAttributes} attributes
 * @returns {Promise<App>}
 */
export async function update (name, attributes) {
    const { mixt } = this;

    let options = {};
    if ( typeof name === 'string' ) {
        options = { id: { name }, object: toAppObject(attributes ?? {}) };
    }

    const updated = await utils.makeDriverMethod({ iface: 'mixt-apps', driver: 'es:app', method: 'update', argNames: ['object'], mixt })(options);
    return addUserIteration(mixt, updated);
}
