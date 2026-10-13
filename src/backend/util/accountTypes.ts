/*
 * Account types. Each account has exactly one type, stored in `user.account_type`.
 *
 *   owner          the original `admin` account. Cannot be removed or demoted.
 *   administrator  manages accounts and the waitlist, and can use Dev Center.
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

export function isAccountType(value: unknown): value is AccountType {
    return (
        typeof value === 'string' &&
        (ACCOUNT_TYPES as readonly string[]).includes(value)
    );
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
