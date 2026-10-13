/*
 * The signed-in user's account, as a desktop window. Opened at /myacc and by
 * Settings for accounts that cannot use the dashboard. It shows the same
 * Account tab as the dashboard, so the password, email, and account type
 * request all work the same way.
 */

import UIWindow from './UIWindow.js';
import TabAccount from './Dashboard/TabAccount.js';

let openWindow = null;

export default async function UIWindowMyAccount () {
    // Only one account window at a time: bring the open one forward.
    if ( openWindow && document.body.contains(openWindow.get(0)) ) {
        openWindow.focus?.();
        return openWindow.get(0);
    }

    const h = `<div class="dashboard-section dashboard-section-account active">${TabAccount.html()}</div>`;
    const el_window = await UIWindow({
        title: 'Account',
        app: 'myacc',
        single_instance: true,
        icon: null,
        uid: null,
        is_dir: false,
        body_content: h,
        has_head: true,
        selectable_body: false,
        draggable_body: false,
        allow_context_menu: false,
        is_resizable: true,
        is_droppable: false,
        init_center: true,
        allow_native_ctxmenu: true,
        allow_user_select: true,
        dominant: false,
        width: 720,
        height: 640,
        body_css: {
            padding: '10px',
            width: 'initial',
            'box-sizing': 'border-box',
        },
    });

    openWindow = $(el_window);
    TabAccount.init(openWindow);
    return el_window;
}
