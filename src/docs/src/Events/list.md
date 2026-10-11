---
title: mixt.events.list()
description: List the persistent subscriptions this caller holds.
platforms: [websites, apps, nodejs, workers]
---

<div class="info">The Events API is in beta. Event shapes, limits, and behavior may change between releases.</div>

Lists the persistent subscriptions created with [`mixt.events.onPersistent()`](/Events/onPersistent/). Session subscriptions from `onLocal()` aren't stored, so they aren't listed.

An app sees only the subscriptions it created. An account session sees all of them, **including ones left by apps that have been deleted**, so that's where to clean up stray subscriptions. A scoped access token, such as the one in a [`getReadURL()`](/FS/getReadURL/) URL, sees none, whether the account or an app created it.

On a website with nobody signed in, it asks the user to sign in first, as other Mixt.js calls do. An app running on Mixt OS is always signed in.

## Syntax
```js
mixt.events.list()
mixt.events.list(options)
```

## Parameters

#### `options` (Object) (optional)

- `limit` (Number): Maximum subscriptions per request. Capped at 200; defaults to 50.
- `cursor` (String | null): The cursor from a previous page. Passing it (even `null`) returns a single page instead of the full list.
- `includeTotal` (Boolean): Adds `total` to the page. Ask for it on the first page only; it gets slower as the count grows.
- `stream` (Boolean): Returns an async iterator of page envelopes instead of a promise.

## Return value

- No pagination options: a `Promise` for an array of every subscription (fetched page by page for you).
- With `cursor` or `includeTotal`: a `Promise` for one page, `{ items, cursor?, total? }`. `cursor` is present while more pages exist.
- With `stream: true`: an async iterator of pages.

**Pages can be short.** Don't treat `items.length < limit` as the end; keep going until `cursor` is absent.

Each subscription is the object [`onPersistent()`](/Events/onPersistent/) returns. In particular:

- `contextKeys` (Array | null) and `contextHash` (String | null) describe the stored `context`. **Values are never returned**, since context often holds secrets. The hash changes whenever a value does.
- `suspendedAt` (Number | null) and `suspendedReason` (String | null) are set when a subscription is [suspended](/Events/onPersistent/#suspended-subscriptions): `handler_not_found`, `failures`, `no_credit`, or `permission_revoked`.
- `targets` (Array) can include `'push'`, which is accepted but delivers nothing yet.

The promise rejects with `{ message, code }`: `auth_canceled` if nobody was signed in and the user closed the sign-in, `too_many_requests` over the listing rate limit, `events_disabled` where events are off, and `events_failed` for a response the SDK couldn't read.

## Examples

<strong class="example-title">List everything this account is watching</strong>

```html;events-list
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            const dir = mixt.randName();
            await mixt.fs.mkdir(dir);
            const sub = await mixt.events.onPersistent({
                subject: `fs:${dir}`,
                context: { label: 'inbox' },
            });

            for (const row of await mixt.events.list()) {
                mixt.print(`${row.subject} — ${row.delivery}`);
                mixt.print(` (context: ${row.contextKeys?.join(', ') ?? 'none'})<br>`);
            }

            await mixt.events.unsubscribe(sub.subId);
        })();
    </script>
</body>
</html>
```

<strong class="example-title">Find the ones that stopped, and why</strong>

```html;events-list-suspended
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            for await (const page of mixt.events.list({ stream: true })) {
                for (const row of page.items) {
                    if (!row.suspendedAt) continue;
                    mixt.print(`${row.subject} stopped: ${row.suspendedReason}<br>`);
                }
            }
            mixt.print('done<br>');
        })();
    </script>
</body>
</html>
```
