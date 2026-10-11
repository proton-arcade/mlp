# Self-hosting Mixt

This guide covers running your own Mixt server. For a quick start, see the [README](../README.md).

## Requirements

- Node.js 18.19 or newer.
- Nothing is downloaded at startup. Dependencies come from `vendor/node-modules/`, and the bundle runs on linux-x64. If the native SQLite driver does not load on your Node version, Mixt uses its bundled WebAssembly SQLite instead and logs one warning. `MIXT_SQLITE_DRIVER=wasm` forces that driver.
- Port 8835 for the HTTPS front. No administrator rights are needed. Stop anything else listening on that port first.
- A browser that accepts a self-signed certificate for `localhost`. The certificate is created in `volatile/tls/` on the first run.

## Start the server

```bash
node server.cjs      # or: npm start
```

On the first run the script:

1. Checks the Node version.
2. Installs npm dependencies.
3. Writes `config.json` from `config.default.json`, if it is missing.
4. Creates the local certificate, if it is missing.
5. Builds the GUI and the Mixt.js SDK.
6. Starts the backend on an internal port, and the HTTPS front on port 8835 in front of it.

Open `https://localhost:8835/`.

## The administrator account

The `admin` account's password is stored in `admin/admin.json` (git-ignored, readable only by its owner). The file is created on the first start with a random password. On every start the `admin` account is set to the password in that file, so to change it run `node admin/set-password.mjs "<new password>"` and restart the server. The password is not printed to the console and is not kept in the database.

Only `admin` can use the server. Other accounts can sign in only after the administrator whitelists them.

## Whitelisting users

Use the **Admin** tab in the dashboard:

- **Add**: enter a username. An existing account is whitelisted and keeps its password. A new account is created with a one-time temporary password, which is shown once and expires after 24 hours. Share it with the user out of band; they should change it at first sign-in.
- **Remove**: revokes access at once. The user's current sessions stop working, and they cannot sign in again until they are re-added.

The Admin tab also shows the server's state: the live user count, every account (creation time, username, email, the built-in `<username>@mixt.email` address and its mailbox, and whether a password is set), app counts, and other server data. Password hashes and plaintext passwords are never displayed.

## Configuration

| File | Purpose |
| --- | --- |
| `config.default.json` | Defaults shipped with Mixt. Do not edit; it is replaced by upgrades. |
| `config.json` | Your settings. Generated on first run and git-ignored. |
| `config.template.jsonc` | Commented template listing the available settings. |

The defaults set:

- `protocol`: `https`, `pub_port`: `8835`, `domain`: `localhost`.
- `disable_user_signup`: `true`, so the sign-up page does not create accounts. Accounts are created by the administrator through the whitelist.

## Data and storage

Runtime data lives under `volatile/`, which is git-ignored:

- `volatile/runtime/`: the default SQLite database (`mixt-database.sqlite`).
- `volatile/tls/`: the local HTTPS certificate.

Back up `volatile/runtime/` to keep your data.

## Notes

- Mixt keeps Mixt OS's server internals, so the wire protocol and the `mixt` SDK are unchanged.
- The AI features are removed. There are no AI providers to configure.
- The Docker and install scripts in the repository (`Dockerfile`, `docker-compose.yml`, `install.sh`, `install.ps1`) were inherited from Mixt OS and have not been rebuilt for Mixt. Use `node server.cjs` unless you have tested the container setup yourself.
