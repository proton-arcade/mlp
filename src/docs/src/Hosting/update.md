---
title: mixt.hosting.update()
description: Update a subdomain to point to a new directory.
platforms: [websites, apps, nodejs, workers]
---

Updates a subdomain to point to a new directory.

## Syntax

```js
mixt.hosting.update(subdomain, dirPath)
```

## Parameters

#### `subdomain` (String) (required)

A string containing the name of the subdomain you want to update.

#### `dirPath` (String) (required)

A string containing the path to the directory you want to serve.

## Return value

A `Promise` that will resolve to a [`Subdomain`](/Objects/subdomain/) object when the subdomain has been updated. If a subdomain with the given name does not exist, the promise will be rejected with an error. If the path does not exist, the promise will be rejected with an error.

## Examples

<strong class="example-title">Update a subdomain to point to a new directory</strong>

```html;hosting-update
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random website
            let subdomain = mixt.randName();
            const site = await mixt.hosting.create(subdomain, '.')
            mixt.print(`Website hosted at: ${site.subdomain}.mixt.site<br>`);

            // (2) Create a random directory
            let dirName = mixt.randName();
            let dir = await mixt.fs.mkdir(dirName)
            mixt.print(`Created directory "${dir.path}"<br>`);

            // (3) Update the site with the new random directory
            await mixt.hosting.update(subdomain, dirName)
            mixt.print(`Changed subdomain's root directory to "${dir.path}"<br>`);

            // (4) Delete the app (cleanup)
            await mixt.hosting.delete(subdomain)
        })();
    </script>
</body>
</html>
```
