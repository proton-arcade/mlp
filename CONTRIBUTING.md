# Contributing to Mixt

Thanks for helping. Mixt is a Mint-styled desktop built on Puter's internals. Please keep changes focused and tested.

## Setup

1. Install Node.js 24 or newer.
2. Clone the repository and run `node server.cjs` (or `npm start`).
3. Open `https://localhost/` and sign in as `admin` with the temporary password printed on the first boot.

## Before you open a pull request

- `npm run typecheck` passes with no new errors. The baseline lives in `tools/typecheck-baseline.json`; if you fix baselined errors, run `npm run typecheck:update` and commit the result.
- The tests you touched pass. Backend: `npm run test:backend`. GUI: `npx vitest run --config src/gui/vitest.config.js`. Puter.js API: `npm run test:puterjs`.
- You have not added AI features, AI provider code, or AI SDK dependencies. The server is intentionally admin-only; do not weaken the lockdown or the whitelist without discussing it first.
- Source files keep their copyright headers. New files should carry the AGPL-3.0 header used by the existing files.

## Conventions

- Keep the `puter` SDK global and the `@heyputer/*` package names. Renaming them breaks the API.
- User-visible text says "Mixt". Strings belong in `src/gui/src/i18n/translations/en.js`; other locales fall back to English for any key they do not define.
- Mixt's visual theme lives in `src/gui/src/css/mixt.css`. Prefer changing its tokens (`--mixt-*`) over editing component styles.
- Write tests against the real server behaviour where you can. Some suites need a booted backend (see `src/backend/testUtil.ts`).

## Licensing

Contributions are licensed under AGPL-3.0-only, the license of the project.
