# Mixt

Mixt is a browser desktop styled after Linux Mint and Cinnamon: a dark bottom panel with a menu button, flat windows with light title bars, and a Mint-Y green accent. Underneath, it runs on the internals of [Puter](https://github.com/HeyPuter/puter), the open-source internet computer. It keeps Puter's backend, GUI, and Puter.js SDK, removes all AI features, and runs the server in a locked-down mode where only the administrator can use it.

## What is different from Puter

- **No AI features.** The AI drivers, the `puter.ai` surface, the `/puterai` routes, the AI SDK dependencies, and the AI documentation and examples are removed.
- **Admin-only backend.** Only the `admin` account can use the server. The administrator can whitelist other users, and removing someone from the whitelist revokes their access.
- **Administration app.** The Admin tab in the dashboard shows the live user count, every account with its creation time, username, email, the built-in `<username>@puter.email` address and mailbox, whether a password is set, app counts, and other server data. Password hashes and plaintext passwords are never shown.
- **Mint look.** The Mint-style panel, window chrome, palette, and fonts come from [webmpl](https://github.com/proton-arcade/webmpl). The stylesheet is `src/gui/src/css/mixt.css`.
- **One run command.** `node server.cjs` does everything. `npm start` runs the same thing.

## Quick start

You need **Node.js 24 or newer**. The first install compiles the SQLite driver (`better-sqlite3`), so it also needs Python 3, `make`, and a C++ compiler (Xcode Command Line Tools on macOS, `build-essential` on Debian/Ubuntu, Visual Studio Build Tools on Windows), and internet access to npm and nodejs.org for the Node headers.

```bash
node server.cjs
```

or

```bash
npm start
```

The first run installs dependencies, writes `config.json` from `config.default.json`, builds the GUI and SDK, and starts the backend. Then open:

**https://mixt.localhost/**

The HTTPS front listens on port 443 and uses a self-signed certificate for `mixt.localhost`, which is created in `volatile/tls/` on first run. Your browser will ask you to accept it once.

Port 443 needs administrator rights on Linux and macOS. Either run `sudo node server.cjs`, or allow Node to bind low ports once:

```bash
sudo setcap 'cap_net_bind_service=+ep' "$(which node)"
```

## First sign-in

On its first boot the server creates the `admin` account with a temporary password and prints it to the console. Sign in as `admin` with it, then change the password. Until you change it, the console prints the temporary password again on every start. Only `admin` can sign in until you add other users.

## Access control

- Anonymous requests and signed-in users other than `admin` are rejected, except for whitelisted users.
- In the Admin tab, the administrator adds a user to the whitelist by username:
  - If the account already exists, it is whitelisted and keeps its password.
  - If it does not exist, a new account is created and its temporary password is shown **once**, and it expires after 24 hours. Give that password to the user out of band.
- Removing a user from the whitelist revokes their access immediately: their existing sessions stop working and they cannot sign in again until re-added.

## Configuration

- `config.default.json` holds the defaults that ship with Mixt.
- `config.json` is generated from it on first run. Local edits go there. It is git-ignored.
- `config.template.jsonc` documents the available settings.

The defaults set the domain to `mixt.localhost`, the HTTPS front to port 443, and disable public sign-up.

## Repository layout

| Path | Contents |
| --- | --- |
| `server.cjs` | The single entry point. Starts the HTTPS front and `tools/start.mjs`. |
| `tools/` | Startup, build, and configuration helpers. |
| `src/backend` | The Puter backend: HTTP controllers, services, drivers, and storage. The lockdown and whitelist live in `core/http/middleware/adminLockdown.ts` and `util/serverWhitelist.ts`. |
| `extensions/` | Server extensions, including the administration API (`admin.ts`). |
| `src/gui` | The desktop, dashboard, and Admin tab. Mixt's theme is `src/gui/src/css/mixt.css`. |
| `src/puter-js` | The Puter.js SDK (package `@heyputer/puter.js`, global `puter`). |
| `src/docs` | The documentation site. |
| `src/cli`, `src/dev-center`, `src/worker-types` | Developer tools for the same platform. |
| `doc/` | Architecture, self-hosting, and internal API notes. |

## Development

```bash
npm run typecheck                 # TypeScript check against the committed baseline
npm run test:backend              # backend test suite
npm run test:puterjs              # Puter.js API tests
npx vitest run --config src/gui/vitest.config.js   # GUI unit tests
```

Some browser-based GUI tests need Playwright's Chromium to be installed.

## Credits and license

Mixt is licensed under the **GNU Affero General Public License v3.0 only** (`LICENSE.txt`). It contains code from Puter, copyright Puter Technologies Inc., which is also AGPL-3.0. Keep the original copyright notices in the source files. The Mint-style visual design is adapted from webmpl.

Mixt is not affiliated with Linux Mint, Cinnamon, or Puter Technologies. The Puter name is kept where it names the upstream project or an API that would break if renamed (the `puter` SDK global, the `@heyputer/*` package names, and the Puter.js name).
