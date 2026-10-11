---
title: mixt.events.unsubscribe()
description: End a persistent subscription.
platforms: [websites, apps, nodejs, workers]
---

<div class="info">The Events API is in beta. Event shapes, limits, and behavior may change between releases.</div>

Ends a subscription created with [`mixt.events.onPersistent()`](/Events/onPersistent/). It stops immediately, and any undelivered backlog is dropped.

For a session subscription from [`mixt.events.onLocal()`](/Events/onLocal/), use [`subscription.off()`](/Events/off/).

On a website with nobody signed in, it asks the user to sign in first, as other Mixt.js calls do. An app running on Mixt OS is always signed in.

## Syntax
```js
mixt.events.unsubscribe(subId)
```

## Parameters

#### `subId` (String) (required)
The `subId` of the subscription, from `onPersistent()` or [`mixt.events.list()`](/Events/list/).

## Return value

A `Promise` that resolves when the subscription is gone.

An id this caller doesn't hold (already ended, or created by another app) is reported as not existing, so the call doesn't reveal which subscriptions exist. If it rejects with any other code, the subscription is still running, and so is any handler it runs on this page. It rejects with `{ message, code }`:

| `code` | Meaning |
| --- | --- |
| `subscription_does_not_exist` | No such subscription, or it isn't this caller's. |
| `auth_canceled` | Nobody was signed in, and the user closed the sign-in without finishing it. |
| `too_many_requests` | Over the unsubscribe rate limit — its own, not the `subscribe` one. |
| `events_disabled` | Events aren't enabled on this server. |
| `events_failed` | The server sent a response the SDK couldn't read. |

An app can only end subscriptions it created. An account session can end any of them, including ones left by deleted apps. A scoped access token, such as the one in a [`getReadURL()`](/FS/getReadURL/) URL, can't end any, whether the account or an app created it.

## Examples

<strong class="example-title">Create a persistent subscription, then end it</strong>

```html;events-unsubscribe
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            const dir = mixt.randName();
            await mixt.fs.mkdir(dir);

            const sub = await mixt.events.onPersistent({ subject: `fs:${dir}` });
            mixt.print(`watching as ${sub.subId}<br>`);

            await mixt.events.unsubscribe(sub.subId);
            mixt.print('stopped<br>');

            // Ending it twice is refused the same way an unknown id is.
            try {
                await mixt.events.unsubscribe(sub.subId);
            } catch (error) {
                mixt.print(`second attempt: ${error.code}<br>`);
            }
        })();
    </script>
</body>
</html>
```
