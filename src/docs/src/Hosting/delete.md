---
title: mixt.hosting.delete()
description: Delete a subdomain from your account.
platforms: [websites, apps, nodejs, workers]
---

Deletes a subdomain from your account. The subdomain will no longer be served by the hosting service. If the subdomain has a directory, it will be disconnected from the subdomain. The associated directory will not be deleted.

## Syntax

```js
mixt.hosting.delete(subdomain)
```

## Parameters

#### `subdomain` (String) (required)

A string containing the name of the subdomain you want to delete.

## Return value

A `Promise` that will resolve to an object of the form `{ success: true, uid: <subdomain-uid> }` when the subdomain has been deleted. If a subdomain with the given name does not exist, the promise will be rejected with an error.

## Examples

<strong class="example-title">Create a random website then delete it</strong>

```html;hosting-delete
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random website
            let subdomain = mixt.randName();
            const site = await mixt.hosting.create(subdomain, '.')
            mixt.print(`Website hosted at: ${site.subdomain}.mixt.site (This is an empty website with no files)<br>`);

            // (2) Delete the website using delete()
            await mixt.hosting.delete(site.subdomain);
            mixt.print('Website deleted<br>');

            // (3) Try to retrieve the website (should fail)
            mixt.print('Trying to retrieve website... (should fail)<br>');
            try {
                await mixt.hosting.get(site.subdomain);
            } catch (e) {
                mixt.print('Website could not be retrieved<br>');
            }
        })();
    </script>
</body>
</html>
```
