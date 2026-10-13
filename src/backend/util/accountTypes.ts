/*
 * Account types. Each account has exactly one type, stored in `user.account_type`.
 *
 *   owner          the original `admin` account. Cannot be removed, demoted or
 *                  have its type changed.
 *   administrator  manages accounts and the waitlist, and can use Dev Center.
 *                  Only the owner may grant or remove this type.
 *   developer      can build and publish apps; can use Dev Center.
 *   standard       a whitelisted user with the default apps and the App Store.
 *   guest          a temporary account with the default apps only, and G-Talk.
 */
export const ACCOUNT_TYPES = [
    'owner',
    'administrator',
    'developer',
    'standard',
    'guest',
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const DEFAULT_ACCOUNT_TYPE: AccountType = 'standard';

/** Built-in account that is always the owner, even before the migration runs. */
export const OWNER_USERNAME = 'admin';

/**
 * Types an administrator may hand out (the owner may also hand out
 * administrator).
 */
const ADMIN_ASSIGNABLE: ReadonlySet<AccountType> = new Set([
    'developer',
    'standard',
    'guest',
]);

export function isAccountType(value: unknown): value is AccountType {
    return (
        typeof value === 'string' &&
        (ACCOUNT_TYPES as readonly string[]).includes(value)
    );
}

/**
 * The account's type. Accounts created before `account_type` existed fall back
 * to owner for the built-in admin account and standard for everyone else.
 */
export function effectiveAccountType(
    user:
        { username?: string | null; account_type?: unknown } | null | undefined,
): AccountType {
    if (isAccountType(user?.account_type)) return user.account_type;
    return (user?.username ?? '').toLowerCase() === OWNER_USERNAME
        ? 'owner'
        : DEFAULT_ACCOUNT_TYPE;
}

/** Owner and administrator accounts may manage other accounts. */
export function canAdministerAccounts(
    type: string | null | undefined,
): boolean {
    return type === 'owner' || type === 'administrator';
}

/** Owner, administrator, and developer accounts may use Dev Center. */
export function canUseDevCenter(type: string | null | undefined): boolean {
    return canAdministerAccounts(type) || type === 'developer';
}

/** Guests have the default apps only. */
export function isGuest(type: string | null | undefined): boolean {
    return type === 'guest';
}

/**
 * Check whether an administrator-side actor may set `target`'s type to `next`.
 * Returns an error message, or null when the change is allowed.
 */
export function accountTypeChangeProblem(
    actorType: AccountType,
    target: { currentType: AccountType },
    next: unknown,
): string | null {
    if (target.currentType === 'owner') {
        return "The owner account's type cannot be changed.";
    }
    if (!isAccountType(next)) {
        return 'account_type must be one of: administrator, developer, standard, guest.';
    }
    if (next === 'owner') {
        return 'The owner type cannot be assigned.';
    }
    if (actorType === 'owner') {
        return null;
    }
    if (actorType === 'administrator') {
        if (target.currentType === 'administrator') {
            return 'Only the owner can change an administrator account.';
        }
        if (next === 'administrator') {
            return 'Only the owner can make an administrator.';
        }
        if (ADMIN_ASSIGNABLE.has(next)) return null;
    }
    return 'Your account cannot change account types.';
}
