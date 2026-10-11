---
title: Events
description: Watch a user's files, key-value data and notifications, and react to changes as they happen.
platforms: [websites, apps, nodejs, workers]
---

<div class="info">The Events API is in beta. Event shapes, limits, and behavior may change between releases.</div>

The Events API tells your app when a user's data changes. Subscribe to a file, a folder, a path that doesn't exist yet, a key-value key, or the user's notifications, and your handler runs each time it changes. There's nothing to poll and no server to run.

There are two kinds of subscription:

- **Session subscriptions** ([`onLocal()`](/Events/onLocal/)) live on the open page and end when it closes. Use them to keep a UI in sync.
- **Persistent subscriptions** ([`onPersistent()`](/Events/onPersistent/)) are stored on the account and keep running while your app is closed, running a [handler](/Events/handlers/) your app publishes. Use them for background work, such as processing uploads as they arrive.

What you watch is written as a subject string:

| Subject | Watches |
| --- | --- |
| `fs:~/Documents` | Everything under a folder, or one file by path or uid |
| `fs:~/inbox/*.json:add` | Matching paths, one kind of change |
| `kv:cart` | One key in your app's key-value store (`kv:cart*` for a prefix) |
| `notif:account` | The user's notifications |

See [`onLocal()`](/Events/onLocal/#subjects) for the full subject syntax, the event shape, and how to share key-value events with another user.

With the [User-Pays Model](/user-pays-model/), deliveries are billed to the user holding the subscription, not to you. See [Rate Limits and Quotas](/rate-limits-and-quotas/#events) for limits and costs.

## Features

<div style="overflow:hidden; margin-bottom: 30px;">
    <div class="example-group active" data-section="watch"><span>Watch a Folder</span></div>
    <div class="example-group" data-section="kv"><span>Watch a Key</span></div>
    <div class="example-group" data-section="missing"><span>Wait for a File</span></div>
    <div class="example-group" data-section="persistent"><span>Run in the Background</span></div>
    <div class="example-group" data-section="list"><span>List Subscriptions</span></div>
    <div class="example-group" data-section="fetch"><span>Catch Up</span></div>
</div>

<div class="example-content" data-section="watch" style="display:block;">

#### Print every change under a folder

```html;events-watch-folder
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a directory to watch
            const dir = mixt.randName();
            await mixt.fs.mkdir(dir);

            // (2) Subscribe to everything under it
            const sub = await mixt.events.onLocal(`fs:${dir}`, ({ event }) => {
                if (event.op === 'gap') {
                    mixt.print(`missed some changes (${event.reason})<br>`);
                    return;
                }
                mixt.print(`${event.op}: ${event.path}<br>`);
            });

            // (3) Change something — the handler runs
            await mixt.fs.write(`${dir}/hello.txt`, 'Hello!');

            // (4) Stop listening (cleanup)
            setTimeout(() => sub.off(), 2000);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="kv">

#### Watch a key-value key and a key prefix

```html;events-watch-kv
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Exactly one key, and separately every key under a prefix.
            const one = await mixt.events.onLocal('kv:cart', ({ event }) =>
                mixt.print(`${event.op}: ${event.key}<br>`));
            const many = await mixt.events.onLocal(
                `kv:${mixt.appID}:cart:*`,
                ({ event }) => mixt.print(`under cart: ${event.key}<br>`));

            // (2) `cart` reaches the first, `cart:items` only the second.
            await mixt.kv.set('cart', { total: 0 });
            await mixt.kv.set('cart:items', ['apple']);

            // (3) Cleanup
            setTimeout(async () => {
                await one.off();
                await many.off();
                await mixt.kv.del('cart');
                await mixt.kv.del('cart:items');
            }, 2000);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="missing">

#### React to a file that does not exist yet

```html;events-watch-missing
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) A directory to work in. `inbox/` below it does not exist yet.
            const dir = mixt.randName();
            await mixt.fs.mkdir(dir);

            // (2) Subscribe anyway — the subscription anchors on `dir` and
            //     matches the rest of the path as it appears.
            const sub = await mixt.events.onLocal(
                `fs:${dir}/inbox/trigger.json:add`,
                ({ event }) => mixt.print(`appeared: ${event.path}<br>`),
                { onError: (error) => mixt.print(`subscription ended: ${error.code}<br>`) },
            );
            mixt.print(`anchored on ${sub.anchor.path}, matching ${sub.match}<br>`);

            // (3) Create it, several directories deep
            await mixt.fs.write(`${dir}/inbox/trigger.json`, '{}', {
                createMissingParents: true,
            });

            setTimeout(() => sub.off(), 2000);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="persistent">

#### Keep watching with a handler after the page closes

```html;events-persistent
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) An app of your own to publish the handler under
            const name = `ingest-${mixt.randName()}`;
            const app = await mixt.apps.create(name, `https://example.com/${name}`);

            // (2) Publish the handler. It closes over nothing — everything it
            //     needs arrives as `ctx`.
            await mixt.events.handlers.publish(
                'ingestUpload',
                async ({ event, ctx }) => {
                    await fetch(ctx.endpoint, {
                        method: 'POST',
                        body: JSON.stringify({ path: event.path, key: ctx.apiKey }),
                    });
                },
                { appUid: app.uid },
            );

            // (3) Subscribe. `context` is read now and never again.
            const dir = mixt.randName();
            await mixt.fs.mkdir(dir);
            const sub = await mixt.events.onPersistent({
                subject: `fs:${dir}`,
                handlerName: 'ingestUpload',
                context: { endpoint: 'https://example.com/ingest', apiKey: 'k-123' },
            });

            mixt.print(`watching ${dir} as ${sub.subId}<br>`);

            // (4) It outlives this page. End it explicitly when you are done.
            await mixt.events.unsubscribe(sub.subId);
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="list">

#### List the persistent subscriptions this account holds

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

</div>

<div class="example-content" data-section="fetch">

#### Read the notifications missed while the app was closed

```html;events-fetch
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            let cursor;
            let seen = 0;
            do {
                const page = await mixt.events.fetch({
                    subject: 'notif:account',
                    cursor,
                });
                for (const event of page.items) {
                    mixt.print(`${event.type}: ${event.notification.title}<br>`);
                    seen++;
                }
                cursor = page.cursor;
            } while (cursor);

            if (!seen) mixt.print('nothing missed<br>');
        })();
    </script>
</body>
</html>
```

</div>

## Functions

These Events features are supported out of the box when using Mixt.js:

- **[`mixt.events.onLocal()`](/Events/onLocal/)** - Subscribe for as long as this client is connected
- **[`subscription.off()`](/Events/off/)** - End a session subscription
- **[`mixt.events.onPersistent()`](/Events/onPersistent/)** - Subscribe with a subscription that keeps running when your app is closed
- **[`mixt.events.list()`](/Events/list/)** - List the persistent subscriptions this caller holds
- **[`mixt.events.unsubscribe()`](/Events/unsubscribe/)** - End a persistent subscription
- **[`mixt.events.fetch()`](/Events/fetch/)** - Read what a subject recorded while nothing was listening
- **[`mixt.events.handlers`](/Events/handlers/)** - Publish, list and remove the named handlers persistent subscriptions run
- **[`mixt.events.workers`](/Events/workers/)** - List and destroy an app's events worker

## Examples

You can see various Mixt.js Events features in action from the following examples:

- Session subscriptions
  - [Watch a Folder](/playground/events-watch-folder/)
  - [Watch a Path Before It Exists](/playground/events-watch-missing/)
  - [Watch Key-Value Changes](/playground/events-watch-kv/)
  - [Stop Watching](/playground/events-off/)
- Persistent subscriptions
  - [Keep Watching in the Background](/playground/events-persistent/)
  - [Bind to a Handler Version](/playground/events-persistent-pinned/)
  - [List Persistent Subscriptions](/playground/events-list/)
  - [Find Suspended Subscriptions](/playground/events-list-suspended/)
  - [End a Persistent Subscription](/playground/events-unsubscribe/)
- Catching up
  - [Catch Up on Notifications](/playground/events-fetch/)
  - [Catch Up, Then Keep Listening](/playground/events-fetch-then-listen/)
- Handlers and workers
  - [Publish and Remove a Handler](/playground/events-handlers/)
  - [Deploy a Set of Handlers](/playground/events-handlers-publish-all/)
  - [List and Destroy Events Workers](/playground/events-workers/)
