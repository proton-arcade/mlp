/*
 * Administration tab. Visible only to the `admin` account. Shows what the
 * server stores: accounts, live sessions, apps, subdomains, groups, storage and
 * the in-built mailboxes. Data comes from GET /admin/overview on the API origin.
 */

const esc = (value) => window.html_encode(value === null || value === undefined ? '' : String(value));

const fmtDate = (iso) => {
    if ( !iso ) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
};

const fmtBytes = (n) => {
    const v = Number(n) || 0;
    if ( v < 1024 ) return `${v} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let x = v / 1024;
    let i = 0;
    while ( x >= 1024 && i < units.length - 1 ) { x /= 1024; i++; }
    return `${x.toFixed(x >= 10 ? 0 : 1)} ${units[i]}`;
};

const yesNo = (v) => (v ? 'Yes' : 'No');

const table = (headers, rows) => {
    if ( rows.length === 0 ) return '<p class="admin-empty">Nothing here yet.</p>';
    const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
    const body = rows.map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');
    return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
};

const section = (title, count, body) => `
    <section class="admin-section">
        <h3>${esc(title)} <span class="admin-count">${esc(count)}</span></h3>
        ${body}
    </section>`;

const card = (label, value) => `
    <div class="admin-card">
        <div class="admin-card-value">${esc(value)}</div>
        <div class="admin-card-label">${esc(label)}</div>
    </div>`;

const renderOverview = (data) => {
    const s = data.summary;
    const cards = [
        card('Live users', s.live_users),
        card('Accounts', s.users),
        card('Active sessions', s.active_sessions),
        card('Apps', s.apps),
        card('Subdomains', s.subdomains),
        card('Groups', s.groups),
        card('Files', s.files),
        card('Stored', fmtBytes(s.storage_bytes)),
        card('Mail messages', s.mail_messages),
        card('Suspended', s.suspended_users),
    ].join('');

    const users = section('Accounts', data.users.length, table(
        ['Username', 'Puter email', 'Email', 'Created', 'Last activity', 'Live', 'Whitelisted', 'Password', 'Email confirmed', '2FA', 'Suspended', 'Storage', 'Files', 'Apps', 'Subdomains', 'Mail (in/sent/out)', 'Groups', 'Signup IP', 'Signup user agent', 'Signup origin', 'Phone', 'Referral'],
        data.users.map((u) => [
            `<strong>${esc(u.username)}</strong>`,
            esc(u.puter_email),
            esc(u.email ?? '—'),
            esc(fmtDate(u.created_at)),
            esc(fmtDate(u.last_activity)),
            yesNo(u.is_live),
            yesNo(u.whitelisted),
            u.has_password ? 'Set' : 'Not set',
            yesNo(u.email_confirmed),
            yesNo(u.otp_enabled),
            u.suspended ? esc(u.suspended_reason || 'Yes') : 'No',
            esc(fmtBytes(u.storage_bytes)),
            esc(u.files),
            esc(u.apps),
            esc(u.subdomains),
            `${esc(u.mail_inbox)} / ${esc(u.mail_sent)} / ${esc(u.mail_outbox)}`,
            esc(u.groups.join(', ') || '—'),
            esc(u.signup_ip ?? '—'),
            esc(u.signup_user_agent ?? '—'),
            esc(u.signup_origin ?? '—'),
            esc(u.phone ?? '—'),
            esc(u.referral_code ?? '—'),
        ]),
    ));

    const sessions = section('Sessions', data.sessions.length, table(
        ['User', 'Status', 'Kind', 'Label', 'Started', 'Last activity', 'Expires', 'Last IP', 'Browser / client', 'App'],
        data.sessions.map((s) => [
            esc(s.username ?? '—'),
            s.live ? '<span class="admin-live">Live</span>' : (s.revoked ? 'Revoked' : (s.active ? 'Idle' : 'Expired')),
            esc(s.kind ?? '—'),
            esc(s.label ?? '—'),
            esc(fmtDate(s.created_at)),
            esc(fmtDate(s.last_activity)),
            esc(fmtDate(s.expires_at)),
            esc(s.last_ip ?? '—'),
            esc(s.last_user_agent ?? '—'),
            esc(s.app_uid ?? '—'),
        ]),
    ));

    const apps = section('Apps', data.apps.length, table(
        ['Name', 'Title', 'Owner', 'Address', 'Created', 'Opens', 'Users who opened', 'Last opened', 'Private', 'Listed', 'Opening items'],
        data.apps.map((a) => [
            esc(a.name ?? '—'),
            esc(a.title ?? '—'),
            esc(a.owner ?? '—'),
            esc(a.index_url ?? '—'),
            esc(fmtDate(a.created_at)),
            esc(a.opens),
            esc(a.open_users),
            esc(fmtDate(a.last_opened)),
            yesNo(a.is_private),
            yesNo(a.approved_for_listing),
            yesNo(a.approved_for_opening_items),
        ]),
    ));

    const subdomains = section('Subdomains', data.subdomains.length, table(
        ['Subdomain', 'Domain', 'Owner', 'Associated app', 'Created'],
        data.subdomains.map((d) => [
            esc(d.subdomain),
            esc(d.domain ?? '—'),
            esc(d.owner ?? '—'),
            esc(d.associated_app_id ?? '—'),
            esc(fmtDate(d.created_at)),
        ]),
    ));

    const groups = section('Groups', data.groups.length, table(
        ['Name', 'Kind', 'Handle', 'Owner', 'Members', 'Directory', '2FA required', 'Created'],
        data.groups.map((g) => [
            esc(g.name ?? '—'),
            esc(g.kind ?? '—'),
            esc(g.handle ?? '—'),
            esc(g.owner ?? '—'),
            esc(g.members),
            yesNo(g.directory_enabled),
            yesNo(g.require_2fa),
            esc(fmtDate(g.created_at)),
        ]),
    ));

    const mail = section('Mail (most recent)', data.mail.total, table(
        ['Address', 'Folder', 'Subject', 'Sent / received', 'Size'],
        data.mail.recent.map((m) => [
            esc(`${m.username}@puter.email`),
            esc(m.folder),
            esc(m.subject || '(no subject)'),
            esc(fmtDate(m.sent_at)),
            esc(fmtBytes(m.size)),
        ]),
    ));

    const notice = pendingNotice
        ? `<div class="admin-notice">${esc(pendingNotice)}</div>`
        : '';
    pendingNotice = null;

    const whitelistSection = section('Whitelisted users', data.whitelist.length, `
        <form class="admin-whitelist-add">
            <input type="text" name="username" placeholder="Username" required autocomplete="off">
            <input type="email" name="email" placeholder="Email (optional, new accounts)" autocomplete="off">
            <button type="submit" class="button">Add user</button>
            <p class="admin-whitelist-msg admin-error"></p>
        </form>
        <p class="admin-generated">Whitelisted users can sign in and use the server. An existing account is added as it is. A new name creates an account with a one-time password, shown once.</p>
        ${table(
            ['Username', 'Account', 'Password', 'Added by', 'Added', 'Last activity', ''],
            data.whitelist.map((w) => [
                `<strong>${esc(w.username)}</strong>`,
                !w.account_exists ? 'Missing' : (w.requires_password_change ? 'Awaiting first sign-in' : 'Active'),
                w.has_password ? 'Set' : 'Not set',
                esc(w.added_by ?? '—'),
                esc(fmtDate(w.added_at)),
                esc(fmtDate(w.last_activity)),
                `<button class="admin-whitelist-remove button" data-username="${esc(w.username)}">Remove</button>`,
            ]),
        )}`);

    return `
        ${notice}
        <div class="admin-cards">${cards}</div>
        <p class="admin-generated">Live = a session used in the last ${esc(data.live_window_minutes)} minutes. Generated ${esc(fmtDate(data.generated_at))}.</p>
        ${whitelistSection}${users}${sessions}${apps}${subdomains}${groups}${mail}`;
};

// Step-up token from /auth/elevate. Held in memory only, for this tab.
let elevationToken = null;

// A one-line message shown above the overview after an action.
let pendingNotice = null;

const authHeaders = () => ({
    Authorization: `Bearer ${puter.authToken}`,
    ...(elevationToken ? { 'x-puter-elevation': elevationToken } : {}),
});

const adminRequest = async (method, path, body) => {
    const headers = authHeaders();
    if ( body ) headers['Content-Type'] = 'application/json';
    const resp = await fetch(`${window.api_origin}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await resp.json().catch(() => ({}));
    return { resp, data };
};

const showElevationForm = ($window, message) => {
    $window.find('.admin-content').html(`
        <form class="admin-elevate">
            <p>${esc(message)}</p>
            <p><input type="password" class="admin-elevate-password" autocomplete="current-password" placeholder="Your password" required></p>
            <p><button type="submit" class="button">Unlock administration</button></p>
            <p class="admin-error admin-elevate-error"></p>
        </form>`);
};

const loadOverview = async (el) => {
    const $window = $(el);
    const $content = $window.find('.admin-content');
    const $button = $window.find('.admin-refresh');
    $button.prop('disabled', true);
    $content.html('<p class="admin-empty">Loading…</p>');
    try {
        const resp = await fetch(`${window.api_origin}/admin/overview`, {
            headers: authHeaders(),
        });
        const body = await resp.json().catch(() => ({}));
        if ( resp.status === 401 || resp.status === 403 ) {
            if ( body.code === 'elevation_required' ) {
                // The admin re-enters their password to unlock this page.
                elevationToken = null;
                showElevationForm($window, 'Enter your password to view the administration data.');
                return;
            }
        }
        if ( !resp.ok ) {
            throw new Error(body.message || `Request failed (${resp.status})`);
        }
        $content.html(renderOverview(body));
    } catch (err) {
        $content.html(`<p class="admin-error">Could not load the overview: ${esc(err.message)}</p>`);
    } finally {
        $button.prop('disabled', false);
    }
};

const submitElevation = async (form, $window) => {
    const $error = $(form).find('.admin-elevate-error');
    const password = $(form).find('.admin-elevate-password').val();
    $error.text('');
    try {
        const resp = await fetch(`${window.api_origin}/auth/elevate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${puter.authToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });
        const body = await resp.json().catch(() => ({}));
        if ( !resp.ok || !body.token ) {
            throw new Error(body.message || 'Could not verify your password.');
        }
        elevationToken = body.token;
        loadOverview($window);
    } catch (err) {
        $error.text(err.message);
    }
};

const TabAdmin = {
    id: 'admin',
    label: 'Administration',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 0-2 2v1H4a1 1 0 0 0-1 1v1H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V6a1 1 0 0 0-1-1h-1V3a2 2 0 0 0-2-2zm0 1.5a.5.5 0 0 1 .5.5v.5h-1V3a.5.5 0 0 1 .5-.5z"/></svg>',
    html: () => `
        <div class="dashboard-section-header">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>Administration</h2>
                <button class="admin-refresh button">Refresh</button>
            </div>
            <p>Everything stored on this server. Only the administrator can see this page.</p>
        </div>
        <div class="admin-content"><p class="admin-empty">Loading…</p></div>`,
    init: ($el_window) => {
        const $window = $($el_window);
        $window.find('.admin-refresh').on('click', () => loadOverview($el_window));
        $window.on('submit', '.admin-elevate', (e) => {
            e.preventDefault();
            submitElevation(e.currentTarget, $el_window);
        });
        $window.on('submit', '.admin-whitelist-add', async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const $msg = $(form).find('.admin-whitelist-msg');
            const username = String($(form).find('[name=username]').val() || '').trim();
            const email = String($(form).find('[name=email]').val() || '').trim();
            $msg.text('');
            const { resp, data } = await adminRequest('POST', '/admin/whitelist', {
                username,
                ...(email ? { email } : {}),
            });
            if ( data.code === 'elevation_required' ) {
                showElevationForm($el_window, 'Confirm your password, then add the user again.');
                return;
            }
            if ( !resp.ok ) {
                $msg.text(data.message || 'Could not add the user.');
                return;
            }
            pendingNotice = data.created_account
                ? `Account "${data.username}" created. One-time password: ${data.temporary_password} (shown once; they must change it at first sign-in).`
                : `"${data.username}" is now whitelisted.`;
            loadOverview($el_window);
        });
        $window.on('click', '.admin-whitelist-remove', async (e) => {
            const username = $(e.currentTarget).data('username');
            if ( !window.confirm(`Remove ${username} from the whitelist? They will be signed out and can no longer use this server.`) ) return;
            const { resp, data } = await adminRequest('DELETE', `/admin/whitelist/${encodeURIComponent(username)}`);
            if ( data.code === 'elevation_required' ) {
                showElevationForm($el_window, 'Confirm your password, then remove the user again.');
                return;
            }
            if ( !resp.ok ) {
                pendingNotice = data.message || 'Could not remove the user.';
            } else {
                pendingNotice = `"${username}" was removed from the whitelist.`;
            }
            loadOverview($el_window);
        });
    },
    onActivate: ($el_window) => {
        loadOverview($el_window);
    },
};

export default TabAdmin;
