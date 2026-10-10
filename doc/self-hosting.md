# Self-hosting Mixt

This guide covers running your own Mixt server. For a quick start, see the [README](../README.md).

## Requirements

- Node.js 24 or newer.
- Port 443 for the HTTPS front. On Linux and macOS, either run as administrator (`sudo node server.cjs`) or grant Node the low-port capability once with `sudo setcap 'cap_net_bind_service=+ep' "$(which node)"`.
- A browser that accepts a self-signed certificate for `mixt.localhost`. The certificate is created in `volatile/tls/` on the first run.

## Start the server

```bash
node server.cjs      # or: npm start
```

On the first run the script:

1. Checks the Node version.
2. Installs npm dependencies.
3. Writes `config.json` from `config.default.json`, if it is missing.
4. Creates the local certificate, if it is missing.
5. Builds the GUI and the Puter.js SDK.
6. Starts the backend on an internal port, and the HTTPS front on port 443 in front of it.

Open `https://mixt.localhost/`.

## The administrator account

The `admin` account is created on the first boot, with a temporary password that is printed to the console. Sign in with it, then change the password.

Only `admin` can use the server. Other accounts can sign in only after the administrator whitelists them.

## Whitelisting users

Use the **Admin** tab in the dashboard:

- **Add**: enter a username. An existing account is whitelisted and keeps its password. A new account is created with a one-time temporary password, which is shown once. Share it with the user out of band; they should change it at first sign-in.
- **Remove**: revokes access at once. The user's current sessions stop working, and they cannot sign in again until they are re-added.

The Admin tab also shows the server's state: the live user count, every account (creation time, username, email, the built-in `<username>@puter.email` address and its mailbox, and whether a password is set), app counts, and other server data. Password hashes and plaintext passwords are never displayed.

## Configuration

| File | Purpose |
| --- | --- |
| `config.default.json` | Defaults shipped with Mixt. Do not edit; it is replaced by upgrades. |
| `config.json` | Your settings. Generated on first run and git-ignored. |
| `config.template.jsonc` | Commented template listing the available settings. |

The defaults set:

- `protocol`: `https`, `pub_port`: `443`, `domain`: `mixt.localhost`.
- `disable_user_signup`: `true`, so the sign-up page does not create accounts. Accounts are created by the administrator through the whitelist.

## Data and storage

Runtime data lives under `volatile/`, which is git-ignored:

- `volatile/runtime/`: the default SQLite database (`puter-database.sqlite`).
- `volatile/tls/`: the local HTTPS certificate.

Back up `volatile/runtime/` to keep your data.

## Notes

- Mixt keeps Puter's server internals, so the wire protocol and the `puter` SDK are unchanged.
- The AI features are removed. There are no AI providers to configure.
- The Docker and install scripts in the repository (`Dockerfile`, `docker-compose.yml`, `install.sh`, `install.ps1`) were inherited from Puter and have not been rebuilt for Mixt. Use `node server.cjs` unless you have tested the container setup yourself.
