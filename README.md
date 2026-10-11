# Mixt

Mixt is a browser desktop styled after Linux Mint and Cinnamon: a dark bottom panel with a menu button, flat windows with light title bars, and a Mint-Y green accent. Underneath, it runs on the internals of [Mixt OS](https://github.com/proton-arcade/mlp), the open-source internet computer. It keeps Mixt OS's backend, GUI, and Mixt.js SDK, removes all AI features, and runs the server in a locked-down mode where only the administrator can use it.

## What is different from Mixt OS

- **No AI features.** The AI drivers, the `mixt.ai` surface, the `/mixtai` routes, the AI SDK dependencies, and the AI documentation and examples are removed.
- **Admin-only backend.** Only the `admin` account can use the server. The administrator can whitelist other users, and removing someone from the whitelist revokes their access.
- **Administration app.** The Admin tab in the dashboard shows the live user count, every account with its creation time, username, email, the built-in `<username>@mixt.email` address and mailbox, whether a password is set, app counts, and other server data. Password hashes and plaintext passwords are never shown.
- **Mint look.** The Mint-style panel, window chrome, palette, and fonts come from [webmpl](https://github.com/proton-arcade/webmpl). The stylesheet is `src/gui/src/css/mixt.css`.
- **One run command.** `node server.cjs` does everything. `npm start` runs the same thing.

## Quick start

You need **Node.js 18.19 or newer**. **Tested only on Node 18.20.8 and Node 24.21.0.** Node 20 and 22 have not been tested.

Dependencies ship inside the repository (`vendor/node-modules/`), so `node server.cjs` never downloads anything. SQLite uses the native `better-sqlite3` build when it loads on your Node version. If it does not, Mixt falls back to a bundled WebAssembly SQLite (`sql.js`), which works on any Node version. Set `MIXT_SQLITE_DRIVER=wasm` to force the fallback, or `native` to force the native driver.

Run the project only with this command (`npm start` runs the same thing):

```bash
node server.cjs
```

The first run installs dependencies, writes `config.json` from `config.default.json`, builds the GUI and SDK, and starts the backend. Then open:

**https://localhost:8835/**

The HTTPS front on port 8835 is the only way in: the backend listens on the loopback address only, and `server.cjs` is the only entry point. The self-signed certificate is created in `volatile/tls/` on first run. Your browser will ask you to accept it once.

## First sign-in

On its first start the server creates `admin/admin.json`, which holds the password of the `admin` account, and it creates the `admin` account with that password. Open the file to read the password, sign in as `admin`, and keep the file private. Only `admin` can sign in until you add other users.

To change the password, run `node admin/set-password.mjs "<new password>"` and restart the server. See [admin/README.md](admin/README.md).

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

The defaults set the domain to `localhost`, the HTTPS front to port 8835, and disable public sign-up.

## Repository layout

| Path | Contents |
| --- | --- |
| `server.cjs` | The single entry point. Starts the HTTPS front and `tools/start.mjs`. |
| `tools/` | Startup, build, and configuration helpers. |
| `src/backend` | The Mixt OS backend: HTTP controllers, services, drivers, and storage. The lockdown and whitelist live in `core/http/middleware/adminLockdown.ts` and `util/serverWhitelist.ts`. |
| `extensions/` | Server extensions, including the administration API (`admin.ts`). |
| `src/gui` | The desktop, dashboard, and Admin tab. Mixt's theme is `src/gui/src/css/mixt.css`. |
| `src/mixt-js` | The Mixt.js SDK (package `@mixt/mixt.js`, global `mixt`). |
| `src/docs` | The documentation site. |
| `src/cli`, `src/dev-center`, `src/worker-types` | Developer tools for the same platform. |
| `doc/` | Architecture, self-hosting, and internal API notes. |

## Development

```bash
npm run typecheck                 # TypeScript check against the committed baseline
npm run test:backend              # backend test suite
npm run test:mixtjs              # Mixt.js API tests
npx vitest run --config src/gui/vitest.config.js   # GUI unit tests
```

Some browser-based GUI tests need Playwright's Chromium to be installed.

## Credits and license

Mixt is licensed under the **GNU Affero General Public License v3.0 only** (`LICENSE.txt`). It contains code derived from Puter, copyright Puter Technologies Inc., which is also AGPL-3.0. Keep the original copyright notices in the source files. The Mint-style visual design is adapted from webmpl.

Mixt is not affiliated with Linux Mint, Cinnamon, or Puter Technologies. The upstream attribution and the `@heyputer/*` npm package names are kept only where a legal notice or an external dependency requires them.
