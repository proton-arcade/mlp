---
title: TypeScript Types
description: Type-checking and autocomplete for Mixt OS Workers via @mixt/worker-types.
platforms: [workers]
---

The [`@mixt/worker-types`](https://www.npmjs.com/package/@mixt/worker-types) package adds TypeScript type definitions for the worker runtime — the `router`, `me`, `my`, `myself`, `mixt_auth`, and `mixt_endpoint` globals — plus typed route handlers with automatic `params` inference from path literals.

It's purely a development-time aid: it adds nothing to your deployed worker bundle.

## Install

```sh
npm install --save-dev @mixt/worker-types
```

## Convention: `*.worker.js`

We recommend naming worker files `*.worker.js` (or `*.worker.ts`). This makes the worker-y parts of your project obvious in a file listing and lets you scope the worker globals to just those files — so `router`, `me`, etc. don't leak into the rest of your code.

The Mixt OS GUI's **New > Worker** action creates files as `New Worker.worker.js` and includes the types reference at the top automatically.

## Setup

Pick whichever style fits your project.

### File-scoped (works for any project)

Add a triple-slash reference at the top of each `*.worker.js` / `*.worker.ts` file. This is the line the GUI now adds for you:

```js
/// <reference types="@mixt/worker-types" />

router.get('/api/hello', ({ request }) => {
    return { msg: 'hello' };
});
```

### Project-wide for worker files only

For projects with many workers, add a worker-only `tsconfig.workers.json` that includes only `*.worker.ts` and pulls in the globals:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["@mixt/worker-types"]
  },
  "include": ["**/*.worker.ts"]
}
```

Then exclude the same files from your main `tsconfig.json`:

```json
{
  "exclude": ["**/*.worker.ts"]
}
```

Build both with `tsc -p tsconfig.json && tsc -p tsconfig.workers.json`, or wire them up with TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html).

### Named imports

For users who prefer being explicit:

```ts
import type { Handler, Router, WorkerEvent } from '@mixt/worker-types';

const getPost: Handler<{ id: string }> = ({ params }) => ({ id: params.id });
router.get('/posts/:id', getPost);
```

Importing anything from the package also pulls the globals into that file, so you don't also need the triple-slash reference.

## Param inference

Path literals are parsed at the type level, so destructured `params` get exact keys without any annotation:

```ts
router.get('/posts/:postId/comments/:commentId', ({ params }) => {
    params.postId;    // string
    params.commentId; // string
});

router.get('/files/*path', ({ params }) => {
    params.path; // string — wildcard captures the remainder
});
```

## What's typed

| Global | Type | Description |
|---|---|---|
| `router` | `Router` | Register handlers via `get`/`post`/`put`/`delete`/`options`/`custom`. |
| `me` | `{ mixt: Mixt OS }` | Deployer's Mixt OS context (FS, KV, auth, etc). |
| `my`, `myself` | `{ mixt: Mixt OS }` | Aliases for `me`. |
| `mixt_auth` | `string` | Deployer's auth token (Cloudflare secret binding). |
| `mixt_endpoint` | `string` | Mixt OS API endpoint. |

Handler events expose:

- `request` — standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request)
- `params` — route params, inferred from the path literal
- `user` / `requestor` — caller's Mixt OS context, present only when invoked with a `mixt-auth` header (e.g. via [`mixt.workers.exec()`](/Workers/exec/))

This `mixt-auth` header rule is for a router-based worker invoked over HTTP. An **events worker** is invoked differently — there is no request to carry a header on — so its handler's `user` is always built from the delivery's own token, never absent. See [`mixt.events.onPersistent()`](/Events/onPersistent/) for what an events worker handler is called with.
