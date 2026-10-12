// Administrator overview. One endpoint, `GET /admin/overview`, that gathers what
// the server stores about accounts, live sessions, apps, subdomains, groups,
// storage and the in-built mailboxes, for the Administration tab in the desktop.
//
// Only the `admin` account reaches this (see adminOnly + the server-wide
// lockdown). Secrets are never returned: password hashes, OTP secrets and
// recovery codes, session and access-token identifiers, reset and confirmation
// tokens, and card fingerprints are all left out. The one exception is account
// passwords the administrator set or created, which are returned only from the
// encrypted admin vault. Mail is listed by subject and time only; message
// bodies are not read.

import bcrypt from 'bcrypt';
import {
    readPassword as readVaultPassword,
    savePassword as saveVaultPassword,
} from '@mixt/backend/src/util/adminVault';
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { extension } from '@mixt/backend/src/extensions';
import { isStorableEmail } from '@mixt/backend/src/util/email';
import { generateDefaultFsentries } from '@mixt/backend/src/util/userProvisioning';
import {
    generateTemporaryPassword,
    temporaryPasswordExpiry,
} from '@mixt/backend/src/util/temporaryPassword';
import {
    type WhitelistEntry,
    isLockdownAdmin,
    readWhitelist,
    whitelistUsernameProblem,
    withWhitelistLock,
    writeWhitelist,
} from '@mixt/backend/src/util/serverWhitelist';

const clients = extension.import('client');
const stores = extension.import('store');
const services = extension.import('service');

/** A session is "live" when it was used within this window. */
const LIVE_WINDOW_MS = 15 * 60 * 1000;
const MAX_SESSIONS = 1000;
const MAX_MESSAGES = 300;

type Row = Record<string, unknown>;

/** Accepts unix seconds, unix ms, `YYYY-MM-DD HH:MM:SS` (UTC) or ISO text. */
const toIso = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null;
    let ms: number;
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
        const n = Number(value);
        ms = n < 1e11 ? n * 1000 : n;
    } else {
        const text = String(value);
        ms = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text)
            ? Date.parse(text.replace(' ', 'T') + 'Z')
            : Date.parse(text);
    }
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

const toMs = (value: unknown): number | null => {
    const iso = toIso(value);
    return iso ? Date.parse(iso) : null;
};

const num = (value: unknown): number => Number(value ?? 0) || 0;

/** Decodes `<uuidv7>--<base64url(subject)>` object names. */
const subjectFromObjectName = (name: string): string => {
    const idx = name.indexOf('--');
    if (idx < 0) return '';
    try {
        return Buffer.from(name.slice(idx + 2), 'base64url').toString('utf8');
    } catch {
        return '';
    }
};

/** Time encoded in a UUIDv7 prefix, in ms, or null. */
const timeFromUuidV7 = (name: string): number | null => {
    const hex = name.slice(0, 36).replace(/-/g, '').slice(0, 12);
    if (!/^[0-9a-f]{12}$/i.test(hex)) return null;
    return parseInt(hex, 16);
};

/** Decrypts the vault record for one account, for the administrator view. */
const storedPasswordFields = (uuid: string) => {
    if (!uuid) return { stored_password: null, password_stored_at: null };
    try {
        const record = readVaultPassword(extension.config.admin_dir, uuid);
        return {
            stored_password: record?.password ?? null,
            password_stored_at: record?.updated_at ?? null,
        };
    } catch (err) {
        console.warn('[admin] could not read the password vault:', err);
        return { stored_password: null, password_stored_at: null };
    }
};

extension.get(
    '/admin/overview',
    { subdomain: 'api', adminOnly: true },
    async (_req: Request, res: Response) => {
        const db = clients.db;
        const now = Date.now();
        const falseLiteral = db.booleanLiteral(false);

        const [
            userRows,
            sessionRows,
            appRows,
            appOpenRows,
            subdomainRows,
            groupRows,
            membershipRows,
            storageRows,
            mailRows,
        ] = await Promise.all([
            db.read(
                'SELECT id, uuid, username, email, email_confirmed, requires_email_confirmation, ' +
                    'unconfirmed_change_email, phone, requires_phone_verification, ' +
                    'requires_card_verification, requires_password_change, temp_password_expires_at, ' +
                    'password IS NOT NULL AS has_password, suspended, suspended_reason, suspended_at, ' +
                    'otp_enabled, unsubscribed, timestamp, last_activity_ts, referrer, referral_code, ' +
                    'referred_by, signup_ip, signup_ip_forwarded, signup_user_agent, signup_origin, ' +
                    'signup_server, free_storage, max_subdomains, dev_first_name, dev_last_name, ' +
                    'dev_approved_for_incentive_program, dev_joined_incentive_program, reputation, ' +
                    'desktop_bg_url, desktop_bg_color FROM `user` ORDER BY id',
            ) as Promise<Row[]>,
            db.read(
                'SELECT id, user_id, kind, label, created_at, last_activity, expires_at, revoked_at, ' +
                    'last_ip, last_user_agent, app_uid, created_via FROM sessions ' +
                    'ORDER BY last_activity DESC LIMIT ' +
                    MAX_SESSIONS,
            ) as Promise<Row[]>,
            db.read(
                'SELECT id, uid, owner_user_id, name, title, index_url, timestamp, is_private, ' +
                    'approved_for_listing, approved_for_opening_items FROM apps ORDER BY id',
            ) as Promise<Row[]>,
            db.read(
                'SELECT app_uid, COUNT(*) AS opens, COUNT(DISTINCT user_id) AS users, ' +
                    'MAX(ts) AS last_opened FROM app_opens GROUP BY app_uid',
            ) as Promise<Row[]>,
            db.read(
                'SELECT id, subdomain, user_id, associated_app_id, domain, ts FROM subdomains ORDER BY id',
            ) as Promise<Row[]>,
            db.read(
                'SELECT id, uid, name, kind, handle, owner_user_id, created_at, directory_enabled, ' +
                    'require_2fa FROM `group` WHERE deleted_at IS NULL ORDER BY id',
            ) as Promise<Row[]>,
            db.read(
                'SELECT m.user_id, g.name AS group_name FROM jct_user_group m ' +
                    'JOIN `group` g ON g.id = m.group_id WHERE g.deleted_at IS NULL',
            ) as Promise<Row[]>,
            db.read(
                'SELECT user_id, COUNT(*) AS files, COALESCE(SUM(size), 0) AS bytes FROM fsentries ' +
                    'WHERE is_dir = ' +
                    falseLiteral +
                    ' GROUP BY user_id',
            ) as Promise<Row[]>,
            db.read(
                'SELECT id, name, path, user_id, created, size FROM fsentries ' +
                    'WHERE is_dir = ' +
                    falseLiteral +
                    " AND path LIKE '%/.mail/%' ORDER BY created DESC",
            ) as Promise<Row[]>,
        ]);

        const whitelist = await readWhitelist(stores.user);
        const whitelisted = new Set(whitelist.map((e) => e.username));

        const usernameById = new Map<number, string>();
        for (const row of userRows)
            usernameById.set(num(row.id), String(row.username));

        // Sessions: live = not revoked, not expired, used recently.
        const sessions = sessionRows.map((s) => {
            const lastActivity = toMs(s.last_activity);
            const expires = toMs(s.expires_at);
            const revoked =
                s.revoked_at !== null &&
                s.revoked_at !== undefined &&
                s.revoked_at !== '';
            const active = !revoked && (expires === null || expires > now);
            const live =
                active &&
                lastActivity !== null &&
                now - lastActivity <= LIVE_WINDOW_MS;
            return {
                id: num(s.id),
                user_id: num(s.user_id),
                username: usernameById.get(num(s.user_id)) ?? null,
                kind: s.kind ?? null,
                label: s.label ?? null,
                created_at: toIso(s.created_at),
                last_activity: toIso(s.last_activity),
                expires_at: toIso(s.expires_at),
                revoked: revoked,
                active,
                live,
                last_ip: s.last_ip ?? null,
                last_user_agent: s.last_user_agent ?? null,
                app_uid: s.app_uid ?? null,
                created_via: s.created_via ?? null,
            };
        });
        const liveUserIds = new Set(
            sessions.filter((s) => s.live).map((s) => s.user_id),
        );

        const storageByUser = new Map<
            number,
            { files: number; bytes: number }
        >();
        for (const row of storageRows) {
            storageByUser.set(num(row.user_id), {
                files: num(row.files),
                bytes: num(row.bytes),
            });
        }

        const groupsByUser = new Map<number, string[]>();
        for (const row of membershipRows) {
            const id = num(row.user_id);
            const list = groupsByUser.get(id) ?? [];
            list.push(String(row.group_name));
            groupsByUser.set(id, list);
        }

        // Mail: `/<username>/.mail/<folder>/<day>/<object>`.
        const mailByUser = new Map<
            string,
            { inbox: number; sent: number; outbox: number }
        >();
        const messages: Array<Record<string, unknown>> = [];
        for (const row of mailRows) {
            const parts = String(row.path).split('/');
            // ['', username, '.mail', folder, day, object]
            const username = parts[1];
            const folder = parts[3];
            if (!username || folder === undefined) continue;
            const counts = mailByUser.get(username) ?? {
                inbox: 0,
                sent: 0,
                outbox: 0,
            };
            if (folder === 'sent') counts.sent++;
            else if (folder === 'outbox') counts.outbox++;
            else counts.inbox++;
            mailByUser.set(username, counts);

            if (messages.length < MAX_MESSAGES) {
                const name = String(row.name);
                const sentMs = timeFromUuidV7(name) ?? toMs(row.created);
                messages.push({
                    username,
                    folder: folder === 'objects' ? 'inbox' : folder,
                    subject: subjectFromObjectName(name),
                    sent_at: sentMs
                        ? new Date(sentMs).toISOString()
                        : toIso(row.created),
                    size: num(row.size),
                });
            }
        }

        const users = userRows.map((u) => {
            const id = num(u.id);
            const username = String(u.username);
            const storage = storageByUser.get(id) ?? { files: 0, bytes: 0 };
            const mail = mailByUser.get(username) ?? {
                inbox: 0,
                sent: 0,
                outbox: 0,
            };
            const userSessions = sessions.filter((s) => s.user_id === id);
            return {
                id,
                uuid: u.uuid ?? null,
                username,
                email: u.email ?? null,
                mixt_email: `${username}@mixt.email`,
                email_confirmed: Boolean(u.email_confirmed),
                requires_email_confirmation: Boolean(
                    u.requires_email_confirmation,
                ),
                unconfirmed_change_email: u.unconfirmed_change_email ?? null,
                phone: u.phone ?? null,
                requires_phone_verification: Boolean(
                    u.requires_phone_verification,
                ),
                requires_card_verification: Boolean(
                    u.requires_card_verification,
                ),
                requires_password_change: Boolean(u.requires_password_change),
                temp_password_expires_at: toIso(u.temp_password_expires_at),
                has_password: Boolean(u.has_password),
                ...storedPasswordFields(String(u.uuid ?? '')),
                otp_enabled: Boolean(u.otp_enabled),
                suspended: Boolean(u.suspended),
                suspended_reason: u.suspended_reason ?? null,
                suspended_at: toIso(u.suspended_at),
                unsubscribed: Boolean(u.unsubscribed),
                created_at: toIso(u.timestamp),
                last_activity: toIso(u.last_activity_ts),
                is_live: liveUserIds.has(id),
                whitelisted: whitelisted.has(username.toLowerCase()),
                referrer: u.referrer ?? null,
                referral_code: u.referral_code ?? null,
                referred_by: u.referred_by ?? null,
                signup_ip: u.signup_ip ?? null,
                signup_ip_forwarded: u.signup_ip_forwarded ?? null,
                signup_user_agent: u.signup_user_agent ?? null,
                signup_origin: u.signup_origin ?? null,
                signup_server: u.signup_server ?? null,
                free_storage_bytes:
                    u.free_storage === null ? null : num(u.free_storage),
                max_subdomains: u.max_subdomains ?? null,
                dev_first_name: u.dev_first_name ?? null,
                dev_last_name: u.dev_last_name ?? null,
                dev_name:
                    [u.dev_first_name, u.dev_last_name]
                        .filter(Boolean)
                        .join(' ') || null,
                dev_approved_for_incentive_program: Boolean(
                    u.dev_approved_for_incentive_program,
                ),
                dev_joined_incentive_program: Boolean(
                    u.dev_joined_incentive_program,
                ),
                reputation: u.reputation ?? null,
                files: storage.files,
                storage_bytes: storage.bytes,
                apps: appRows.filter((a) => num(a.owner_user_id) === id).length,
                subdomains: subdomainRows.filter((s) => num(s.user_id) === id)
                    .length,
                groups: groupsByUser.get(id) ?? [],
                sessions_total: userSessions.length,
                sessions_active: userSessions.filter((s) => s.active).length,
                mail_inbox: mail.inbox,
                mail_sent: mail.sent,
                mail_outbox: mail.outbox,
            };
        });

        const openStats = new Map<string, Row>();
        for (const row of appOpenRows) openStats.set(String(row.app_uid), row);

        const apps = appRows.map((a) => {
            const stats = openStats.get(String(a.uid));
            return {
                id: num(a.id),
                uid: a.uid,
                name: a.name ?? null,
                title: a.title ?? null,
                index_url: a.index_url ?? null,
                owner_user_id: num(a.owner_user_id),
                owner: usernameById.get(num(a.owner_user_id)) ?? null,
                created_at: toIso(a.timestamp),
                is_private: Boolean(a.is_private),
                approved_for_listing: Boolean(a.approved_for_listing),
                approved_for_opening_items: Boolean(
                    a.approved_for_opening_items,
                ),
                opens: num(stats?.opens),
                open_users: num(stats?.users),
                last_opened: toIso(stats?.last_opened),
            };
        });

        const subdomains = subdomainRows.map((s) => ({
            subdomain: s.subdomain,
            domain: s.domain ?? null,
            user_id: num(s.user_id),
            owner: usernameById.get(num(s.user_id)) ?? null,
            associated_app_id: s.associated_app_id ?? null,
            created_at: toIso(s.ts),
        }));

        const memberCounts = new Map<string, number>();
        for (const row of membershipRows) {
            const name = String(row.group_name);
            memberCounts.set(name, (memberCounts.get(name) ?? 0) + 1);
        }
        const groups = groupRows.map((g) => ({
            id: num(g.id),
            uid: g.uid ?? null,
            name: g.name ?? null,
            kind: g.kind ?? null,
            handle: g.handle ?? null,
            owner: usernameById.get(num(g.owner_user_id)) ?? null,
            created_at: toIso(g.created_at),
            members: memberCounts.get(String(g.name)) ?? 0,
            directory_enabled: Boolean(g.directory_enabled),
            require_2fa: Boolean(g.require_2fa),
        }));

        const totalBytes = storageRows.reduce(
            (sum, r) => sum + num(r.bytes),
            0,
        );
        const totalFiles = storageRows.reduce(
            (sum, r) => sum + num(r.files),
            0,
        );

        res.json({
            generated_at: new Date(now).toISOString(),
            live_window_minutes: LIVE_WINDOW_MS / 60000,
            summary: {
                users: users.length,
                live_users: liveUserIds.size,
                active_sessions: sessions.filter((s) => s.active).length,
                apps: apps.length,
                subdomains: subdomains.length,
                groups: groups.length,
                files: totalFiles,
                storage_bytes: totalBytes,
                mail_messages: mailRows.length,
                suspended_users: users.filter((u) => u.suspended).length,
            },
            users,
            sessions,
            apps,
            subdomains,
            groups,
            mail: { recent: messages, total: mailRows.length },
            whitelist: whitelistView(whitelist, userRows),
        });
    },
);

// -- whitelist -------------------------------------------------------------

/** The whitelist with each entry's account status, for display. */
function whitelistView(entries: WhitelistEntry[], userRows: Row[]) {
    return entries.map((e) => {
        const account = userRows.find(
            (u) => String(u.username).toLowerCase() === e.username,
        );
        return {
            username: e.username,
            added_by: e.added_by || null,
            added_at: toIso(e.added_at),
            account_exists: Boolean(account),
            has_password: Boolean(account?.has_password),
            requires_password_change: Boolean(
                account?.requires_password_change,
            ),
            temp_password_expires_at: toIso(account?.temp_password_expires_at),
            last_activity: toIso(account?.last_activity_ts),
        };
    });
}

/**
 * Whitelist a user. An existing account is just added to the list. For a new
 * name, an account is created with a one-time password. It is returned in the
 * response for the administrator to pass on, and kept in the admin vault until
 * the account changes it.
 */
const addToWhitelist = async (req: Request, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const username = String(body.username ?? '').trim();
    const emailInput = typeof body.email === 'string' ? body.email.trim() : '';

    const problem = whitelistUsernameProblem(username);
    if (problem) {
        res.status(400).json({ message: problem, code: 'bad_request' });
        return;
    }
    if (isLockdownAdmin(username)) {
        res.status(400).json({
            message: 'The administrator is always allowed.',
            code: 'bad_request',
        });
        return;
    }

    const entries = await readWhitelist(stores.user);
    if (entries.some((e) => e.username === username.toLowerCase())) {
        res.status(409).json({
            message: 'That user is already whitelisted.',
            code: 'conflict',
        });
        return;
    }

    const addedBy = req.actor?.user?.username ?? 'admin';
    let temporaryPassword: string | null = null;

    if (!(await stores.user.getByUsername(username))) {
        if (emailInput && !isStorableEmail(emailInput)) {
            res.status(400).json({
                message: 'Invalid email address.',
                code: 'bad_request',
            });
            return;
        }
        if (emailInput && (await stores.user.findEmailOwner(emailInput))) {
            res.status(409).json({
                message: 'That email address is already in use.',
                code: 'email_already_in_use',
            });
            return;
        }
        if (
            await stores.fsEntry.findHomePathConflict(username, undefined, {
                includeDescendants: true,
            })
        ) {
            res.status(409).json({
                message: 'That username is taken.',
                code: 'username_already_in_use',
            });
            return;
        }

        temporaryPassword = generateTemporaryPassword();
        const newUuid = uuidv4();
        const created = await stores.user.create({
            username,
            uuid: newUuid,
            password: await bcrypt.hash(temporaryPassword, 8),
            email: emailInput || null,
            free_storage: extension.config.storage_capacity ?? null,
            requires_email_confirmation: false,
        });
        saveVaultPassword(
            extension.config.admin_dir,
            newUuid,
            username,
            temporaryPassword,
        );
        await stores.user.update(created.id, {
            requires_password_change: 1,
            temp_password_expires_at: temporaryPasswordExpiry(),
        });
        await stores.user.invalidateById(created.id);
        try {
            await generateDefaultFsentries(clients.db, stores.user, created);
        } catch (err) {
            console.warn('[admin] failed to provision home for', username, err);
        }
    }

    await writeWhitelist(stores.user, [
        ...entries,
        {
            username: username.toLowerCase(),
            added_by: addedBy,
            added_at: new Date().toISOString(),
        },
    ]);

    res.status(temporaryPassword ? 201 : 200).json({
        username,
        created_account: temporaryPassword !== null,
        temporary_password: temporaryPassword,
        whitelist: whitelistView(
            await readWhitelist(stores.user),
            await clients.db.read(
                'SELECT id, username, password IS NOT NULL AS has_password, ' +
                    'requires_password_change, temp_password_expires_at, ' +
                    'last_activity_ts FROM `user`',
            ),
        ),
    });
};

extension.post(
    '/admin/whitelist',
    { subdomain: 'api', adminOnly: true },
    (req: Request, res: Response) =>
        withWhitelistLock(() => addToWhitelist(req, res)),
);

/**
 * Remove a user from the whitelist. Their sessions are revoked, so they are
 * signed out at once. The account and its files are kept.
 */
const removeFromWhitelist = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const username = String(req.params.username ?? '').toLowerCase();
    const entries = await readWhitelist(stores.user);
    if (!entries.some((e) => e.username === username)) {
        res.status(404).json({
            message: 'That user is not whitelisted.',
            code: 'not_found',
        });
        return;
    }

    await writeWhitelist(
        stores.user,
        entries.filter((e) => e.username !== username),
    );

    const account = await stores.user.getByUsername(username);
    if (account) {
        await services.auth.revokeAllSessionsForUserId(account.id);
    }

    res.json({ username, removed: true });
};

/**
 * Sets an account's password from the Administration page. The new password is
 * hashed for sign-in and also stored in the admin vault, so the page can show
 * it.
 */
extension.post(
    '/admin/accounts/:username/password',
    { subdomain: 'api', adminOnly: true },
    async (req: Request, res: Response) => {
        const username = String(req.params.username ?? '');
        const password =
            typeof req.body?.password === 'string' ? req.body.password : '';
        if (password.length < 8) {
            res.status(400).json({
                message: 'The password must be at least 8 characters.',
            });
            return;
        }
        const account = await stores.user.getByUsername(username);
        if (!account) {
            res.status(404).json({ message: 'No account has that username.' });
            return;
        }
        // The administrator's password is owned by admin/admin.json and is
        // re-applied on every start, so a change made here would be undone.
        if (String(account.username).toLowerCase() === 'admin') {
            res.status(409).json({
                message:
                    'The administrator password is set in admin/admin.json. Run node admin/set-password.mjs and restart the server.',
                code: 'admin_password_in_file',
            });
            return;
        }
        await stores.user.update(account.id, {
            password: await bcrypt.hash(password, 8),
            requires_password_change: 0,
            temp_password_expires_at: null,
        });
        saveVaultPassword(
            extension.config.admin_dir,
            String(account.uuid),
            account.username,
            password,
        );
        await stores.user.invalidateById(account.id);
        // A password change signs the account out everywhere, as a reset does.
        await services.auth.revokeAllSessionsForUserId(account.id);
        res.json({ username: account.username, updated: true });
    },
);

extension.delete(
    '/admin/whitelist/:username',
    { subdomain: 'api', adminOnly: true },
    (req: Request, res: Response) =>
        withWhitelistLock(() => removeFromWhitelist(req, res)),
);

/**
 * Edits one account from the Administration page. Only the fields listed here
 * can change. The username cannot be renamed (files and app data are keyed by
 * it), and one-time sign-in settings such as 2FA are left to the account owner.
 * The `admin` account cannot be suspended or removed from the whitelist.
 */
const ACCOUNT_TEXT_FIELDS: Record<string, { column: string; max: number }> = {
    email: { column: 'email', max: 254 },
    phone: { column: 'phone', max: 32 },
    suspended_reason: { column: 'suspended_reason', max: 200 },
    dev_first_name: { column: 'dev_first_name', max: 100 },
    dev_last_name: { column: 'dev_last_name', max: 100 },
};

const ACCOUNT_FLAG_FIELDS: Record<string, string> = {
    email_confirmed: 'email_confirmed',
    requires_password_change: 'requires_password_change',
    dev_approved_for_incentive_program: 'dev_approved_for_incentive_program',
};

const optionalCount = (value: unknown): number | null | undefined => {
    if (value === null || value === '') return null;
    if (value === undefined) return undefined;
    const n = Number(value);
    return Number.isInteger(n) && n >= 0 ? n : NaN;
};

extension.patch(
    '/admin/accounts/:username',
    { subdomain: 'api', adminOnly: true },
    async (req: Request, res: Response) => {
        const username = String(req.params.username ?? '');
        const body = (req.body ?? {}) as Row;
        const account = await stores.user.getByUsername(username);
        if (!account) {
            res.status(404).json({ message: 'No account has that username.' });
            return;
        }
        const isAdmin = String(account.username).toLowerCase() === 'admin';
        const update: Row = {};
        const errors: string[] = [];

        for (const [key, rule] of Object.entries(ACCOUNT_TEXT_FIELDS)) {
            if (!(key in body)) continue;
            const raw = body[key];
            if (raw === null || raw === '') {
                update[rule.column] = null;
                continue;
            }
            if (typeof raw !== 'string' || raw.length > rule.max) {
                errors.push(
                    `${key} must be text of at most ${rule.max} characters.`,
                );
                continue;
            }
            if (key === 'email' && !isStorableEmail(raw.trim())) {
                errors.push('The email address is not valid.');
                continue;
            }
            update[rule.column] = raw.trim();
        }

        for (const [key, column] of Object.entries(ACCOUNT_FLAG_FIELDS)) {
            if (!(key in body)) continue;
            if (typeof body[key] !== 'boolean') {
                errors.push(`${key} must be true or false.`);
                continue;
            }
            update[column] = body[key] ? 1 : 0;
        }

        if ('free_storage_bytes' in body) {
            const n = optionalCount(body.free_storage_bytes);
            if (Number.isNaN(n))
                errors.push(
                    'free_storage_bytes must be a whole number of bytes.',
                );
            else update.free_storage = n;
        }
        if ('max_subdomains' in body) {
            const n = optionalCount(body.max_subdomains);
            if (Number.isNaN(n))
                errors.push('max_subdomains must be a whole number.');
            else update.max_subdomains = n;
        }

        if ('suspended' in body) {
            if (typeof body.suspended !== 'boolean') {
                errors.push('suspended must be true or false.');
            } else if (body.suspended && isAdmin) {
                errors.push('The administrator account cannot be suspended.');
            } else {
                update.suspended = body.suspended ? 1 : 0;
                update.suspended_at = body.suspended
                    ? Math.floor(Date.now() / 1000)
                    : null;
                if (!body.suspended) update.suspended_reason = null;
            }
        }

        let whitelistChange: boolean | null = null;
        if ('whitelisted' in body) {
            if (typeof body.whitelisted !== 'boolean') {
                errors.push('whitelisted must be true or false.');
            } else if (!body.whitelisted && isAdmin) {
                errors.push('The administrator account stays whitelisted.');
            } else {
                whitelistChange = body.whitelisted;
            }
        }

        if (errors.length) {
            res.status(400).json({
                message: errors.join(' '),
                code: 'invalid_account_fields',
            });
            return;
        }

        if (Object.keys(update).length) {
            await stores.user.update(account.id, update);
            await stores.user.invalidateById(account.id);
        }

        if (whitelistChange !== null) {
            await withWhitelistLock(async () => {
                const entries = await readWhitelist(stores.user);
                const listed = entries.some(
                    (e) => e.username === account.username.toLowerCase(),
                );
                if (whitelistChange && !listed) {
                    await writeWhitelist(stores.user, [
                        ...entries,
                        {
                            username: account.username.toLowerCase(),
                            added_by: 'admin',
                            added_at: new Date().toISOString(),
                        },
                    ]);
                } else if (!whitelistChange && listed) {
                    await writeWhitelist(
                        stores.user,
                        entries.filter(
                            (e) =>
                                e.username !== account.username.toLowerCase(),
                        ),
                    );
                }
            });
        }

        // Suspending or removing from the whitelist signs the account out at once.
        if (update.suspended === 1 || whitelistChange === false) {
            await services.auth.revokeAllSessionsForUserId(account.id);
        }

        res.json({
            username: account.username,
            updated: true,
            fields: Object.keys(update),
            whitelist_changed: whitelistChange !== null,
        });
    },
);
