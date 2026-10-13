---
title: mixt.apps.delete()
description: Delete apps from your Mixt OS account.
platforms: [websites, apps, nodejs, workers]
---

Deletes an app with the given name.

## Syntax

```js
mixt.apps.delete(name)
```

## Parameters

#### `name` (required)

The name of the app to delete.

## Return value

A `Promise` that will resolve to an object `{ success: true, uid: <app uid> }` indicating whether the deletion was successful, along with the `uid` of the deleted app.

## Examples

<strong class="example-title">Create a random app then delete it</strong>

```html;app-delete
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Generate a random app name to make sure it doesn't already exist
            let appName = mixt.randName();

            // (2) Create the app
            await mixt.apps.create(appName, "https://example.com");
            mixt.print(`"${appName}" created<br>`);

            // (3) Delete the app
            await mixt.apps.delete(appName);
            mixt.print(`"${appName}" deleted<br>`);

            // (4) Try to retrieve the app (should fail)
            mixt.print(`Trying to retrieve "${appName}"...<br>`);
            try {
                await mixt.apps.get(appName);
            } catch (e) {
                mixt.print(`"${appName}" could not be retrieved<br>`);
            }
        })();
    </script>
</body>
</html>
```
