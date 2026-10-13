# Administrator

`admin.json` holds the password of the `admin` account. It is created on the
first start, and it is git-ignored.

```json
{
    "password": "the administrator password"
}
```

## Change the password

Either run the script and restart the server:

```bash
node admin/set-password.mjs "a new password of at least 8 characters"
node server.cjs
```

or run `node admin/set-password.mjs` with no argument to get a random
password, then restart. Or edit `admin.json` by hand. On every start the
`admin` account is set to the password in this file.

The file is readable only by its owner. Keep it out of version control.

The administrator password cannot be changed from the Admin tab. The server
re-applies `admin.json` on every start, so a change made there would be undone.

Passwords for other accounts are kept in `admin/vault/`, encrypted with the key
in `admin/vault.key`. Both are git-ignored and must stay private.
