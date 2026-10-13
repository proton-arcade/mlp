---
title: mixt.hosting.list()
description: List all subdomains in your Mixt OS account.
platforms: [websites, apps, nodejs, workers]
---

Returns an array of all subdomains in the user's subdomains that this app has access to. If the user has no subdomains, the array will be empty.

## Syntax
```js
mixt.hosting.list()
mixt.hosting.list(options)
```

## Parameters

#### `options` (Object) (optional)

An object with the following optional properties:

- `limit` (Number): Maximum number of subdomains to return in a single call.
- `offset` (Number): Skips the given number of subdomains. Prefer `cursor` for paging through large lists.
- `cursor` (String | null): Opts into paginated results. Pass `null` for the first page, then the `cursor` from each page to fetch the next one.
- `includeTotal` (Boolean): If `true`, the paginated result includes a `total` count.
- `stream` (Boolean): If `true`, the method returns an async iterator of page objects instead of a promise, for use with `for await ... of`. Combine with `limit` to control the page size, or `cursor` to resume from a previous page. Cannot be combined with `offset`. With `includeTotal`, only the first page carries `total`.

## Return value
A `Promise` that will resolve to an array of all [`Subdomain`](/Objects/subdomain/) objects belonging to the user that this app has access to.

When the request includes `cursor` (even `null`) or `includeTotal`, the promise instead resolves to a page object:

- `items` (Array): The [`Subdomain`](/Objects/subdomain/) objects on this page.
- `cursor` (String) (optional): Present while more pages exist; pass it to the next call.
- `total` (Number) (optional): Present when `includeTotal` was set.

Requests without pagination params keep returning the full list as a plain array, so existing code is unaffected — under the hood the SDK now fetches it page by page.

With `stream: true`, the method returns an async iterator of page objects instead:

```js
for await (const page of mixt.hosting.list({ stream: true })) {
    for (const site of page.items) {
        console.log(site.subdomain);
    }
}
```

Worker-backed subdomains are never included in the results — pages and `total` only count sites. Use [`mixt.workers.list()`](/Workers/list/) to list workers.

## Examples

<strong class="example-title">Create 3 random websites and then list them</strong>

```html;hosting-list
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Generate 3 random subdomains
            let site_1 = mixt.randName();
            let site_2 = mixt.randName();
            let site_3 = mixt.randName();

            // (2) Create 3 empty websites with the subdomains we generated
            await mixt.hosting.create(site_1, '.');
            await mixt.hosting.create(site_2, '.');
            await mixt.hosting.create(site_3, '.');

            // (3) Get all subdomains
            let sites = await mixt.hosting.list();

            // (4) Display the names of the websites
            mixt.print(sites.map(site => site.subdomain));

            // Delete all sites (cleanup)
            await mixt.hosting.delete(site_1);
            await mixt.hosting.delete(site_2);
            await mixt.hosting.delete(site_3);
        })();
    </script>
</body>
</html>
```
