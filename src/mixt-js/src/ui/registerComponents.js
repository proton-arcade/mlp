/**
 * registerComponents - Auto-registers all Mixt web components.
 * Called during SDK initialization in index.js.
 */

import MixtAlert from './components/MixtAlert.js';
import MixtPrompt from './components/MixtPrompt.js';
import MixtNotification from './components/MixtNotification.js';
import MixtContextMenu from './components/MixtContextMenu.js';
import MixtSpinner from './components/MixtSpinner.js';
import MixtMenubar from './components/MixtMenubar.js';
import MixtColorPicker from './components/MixtColorPicker.js';
import MixtFontPicker from './components/MixtFontPicker.js';

const components = [
    ['mixt-alert', MixtAlert],
    ['mixt-prompt', MixtPrompt],
    ['mixt-notification', MixtNotification],
    ['mixt-context-menu', MixtContextMenu],
    ['mixt-spinner', MixtSpinner],
    ['mixt-menubar', MixtMenubar],
    ['mixt-color-picker', MixtColorPicker],
    ['mixt-font-picker', MixtFontPicker],
];

export function registerComponents () {
    if ( typeof globalThis.HTMLElement === 'undefined' || !globalThis.customElements ) {
        return;
    }

    for ( const [tag, cls] of components ) {
        if ( ! customElements.get(tag) ) {
            customElements.define(tag, cls);
        }
    }
}

export default registerComponents;
