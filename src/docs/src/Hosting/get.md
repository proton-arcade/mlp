---
title: mixt.hosting.get()
description: Get information on a subdomain hosted on Mixt OS.
platforms: [websites, apps, nodejs, workers]
---

Returns a subdomain. If the subdomain does not exist, the promise will be rejected with an error.

## Syntax

```js
mixt.hosting.get(subdomain)
```

## Parameters
#### `subdomain` (String) (required)
A string containing the name of the subdomain you want to retrieve.

## Return value
A `Promise` that will resolve to a [`Subdomain`](/Objects/subdomain/) object when the subdomain has been retrieved. If a subdomain with the given name does not exist, the promise will be rejected with an error.

## Examples

<strong class="example-title">Get a subdomain</strong>

```html;hosting-get
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        (async () => {
            // (1) Create a random website
            let subdomain = mixt.randName();
            const site = await mixt.hosting.create(subdomain, '.')
            mixt.print(`Website hosted at: ${site.subdomain}.mixt.site (This is an empty website with no files)<br>`);

            // (2) Retrieve the website using get()
            const site2 = await mixt.hosting.get(site.subdomain);
            mixt.print(`Website retrieved: subdomain=${site2.subdomain}.mixt.site UID=${site2.uid}<br>`);

            // (3) Delete the website (cleanup)
            await mixt.hosting.delete(subdomain);
        })();
    </script>
</body>
</html>
```
