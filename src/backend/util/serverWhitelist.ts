/*
 * Who may use this server. The `admin` account always may. Everyone else must
 * be on the whitelist the administrator maintains.
 *
 * The whitelist is kept on the admin account's own metadata, under
 * `server_whitelist`, as a list of { username, added_by, added_at }. That needs
 * no schema change and works on every supported database. Checks are cached for
 * a few seconds, and writes clear the cache in this process.
 */

import type { UserStore } from '../stores/user/UserStore';
import { isReservedUsername } from './reservedUsernames';

export const LOCKDOWN_ADMIN_USERNAME = 'admin';
export const WHITELIST_METADATA_KEY = 'server_whitelist';
export const WHITELIST_CACHE_MS = 5_000;

// Same rules as sign-up (AuthController).
export const WHITELIST_USERNAME_REGEX = /^\w{1,}$/;
export const WHITELIST_USERNAME_MAX_LENGTH = 45;

export interface WhitelistEntry {
    username: string;
    added_by: string;
    added_at: string;
}

let cache: { at: number; names: Set<string> } | null = null;

let whitelistLock: Promise<unknown> = Promise.resolve();

/**
 * Run a whitelist read-modify-write one at a time. Without this, two admin
 * requests that both read the list before either writes would drop one entry.
 */
export const withWhitelistLock = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = whitelistLock.then(fn, fn);
    whitelistLock = run.catch((): undefined => undefined);
    return run;
};

const normalize = (value: unknown): string => String(value ?? '').toLowerCase();

/** The `admin` account, in any letter case. */
export const isLockdownAdmin = (username: unknown): boolean =>
    normalize(username) === LOCKDOWN_ADMIN_USERNAME;

const parseEntries = (value: unknown): WhitelistEntry[] => {
    if (!Array.isArray(value)) return [];
    return value
        .filter(
            (e): e is Record<string, unknown> =>
                !!e &&
                typeof e === 'object' &&
                typeof (e as { username?: unknown }).username === 'string',
        )
        .map((e) => ({
            username: normalize(e.username),
            added_by: String(e.added_by ?? ''),
            added_at: String(e.added_at ?? ''),
        }));
};

export const readWhitelist = async (
    users: UserStore,
): Promise<WhitelistEntry[]> => {
    const admin = await users.getByUsername(LOCKDOWN_ADMIN_USERNAME);
    const meta = (admin?.metadata ?? {}) as Record<string, unknown>;
    return parseEntries(meta[WHITELIST_METADATA_KEY]);
};

export const writeWhitelist = async (
    users: UserStore,
    entries: WhitelistEntry[],
): Promise<void> => {
    const admin = await users.getByUsername(LOCKDOWN_ADMIN_USERNAME);
    if (!admin) throw new Error('The administrator account does not exist.');
    await users.updateMetadata(admin.id, { [WHITELIST_METADATA_KEY]: entries });
    cache = null;
};

const whitelistNames = async (users: UserStore): Promise<Set<string>> => {
    const now = Date.now();
    if (cache && now - cache.at < WHITELIST_CACHE_MS) return cache.names;
    const names = new Set((await readWhitelist(users)).map((e) => e.username));
    cache = { at: now, names };
    return names;
};

/** True when the account may use the server: the admin, or a whitelisted user. */
export const isServerUserAllowed = async (
    users: UserStore,
    username: unknown,
): Promise<boolean> => {
    const name = normalize(username);
    if (!name) return false;
    if (isLockdownAdmin(name)) return true;
    return (await whitelistNames(users)).has(name);
};

/** Why a username cannot be added to the whitelist, or null if it can. */
export const whitelistUsernameProblem = (username: string): string | null => {
    if (!WHITELIST_USERNAME_REGEX.test(username)) {
        return 'Usernames may only contain letters, numbers and underscores.';
    }
    if (username.length > WHITELIST_USERNAME_MAX_LENGTH) {
        return `Usernames may be at most ${WHITELIST_USERNAME_MAX_LENGTH} characters.`;
    }
    if (isReservedUsername(username)) return 'That username is reserved.';
    return null;
};
