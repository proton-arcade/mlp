/*
 * Account types on the client. The server sends `account_type` with the
 * signed-in user (login and /whoami). Sessions that predate the field fall
 * back to the built-in admin account being the owner, as on the server.
 */

export const ACCOUNT_TYPE_LABELS = {
    owner: 'Owner',
    administrator: 'Administrator',
    developer: 'Developer',
    standard: 'Standard',
    guest: 'Guest',
};

export const accountTypeOf = (user) => {
    if ( user?.account_type ) return user.account_type;
    return user?.username === 'admin' ? 'owner' : 'standard';
};

// Owner and administrator accounts see the Administration page.
export const canAdministerAccounts = (user) =>
    ['owner', 'administrator'].includes(accountTypeOf(user));
