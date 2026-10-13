---
title: mixt.apps.checkName()
description: Check whether an app name is still available.
platforms: [websites, apps, nodejs, workers]
---

Checks whether an app name is available to you, without creating anything. Useful before calling [`mixt.apps.create()`](/Apps/create/), which rejects when the name is already taken.

## Syntax

```js
mixt.apps.checkName(name)
```

## Parameters

#### `name` (String) (required)

The app name to check. Rejects with an `invalid_request` error when it is missing or empty.

## Return value

A `Promise` that will resolve to an object describing the name's availability.

## Examples

<strong class="example-title">Check a name before creating the app</strong>

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            const appName = mixt.randName();

            // (1) A freshly generated name is available
            mixt.print(JSON.stringify(await mixt.apps.checkName(appName)) + '<br>');

            // (2) Create the app, which takes the name
            await mixt.apps.create(appName, 'https://example.com');

            // (3) The same name now reports differently
            mixt.print(JSON.stringify(await mixt.apps.checkName(appName)) + '<br>');

            // (4) Delete the app (cleanup)
            await mixt.apps.delete(appName);
        })();
    </script>
</body>
</html>
```
