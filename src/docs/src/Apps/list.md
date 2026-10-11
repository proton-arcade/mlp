---
title: mixt.apps.list()
description: List all apps in your Mixt OS account.
platforms: [websites, apps, nodejs, workers]
---

Returns an array of all apps belonging to the user and that this app has access to. If the user has no apps, the array will be empty.

## Syntax

```js
mixt.apps.list()
mixt.apps.list(options)
```

## Parameters

#### `options` (optional)

An object containing the following properties:

- `stats_period` (optional): A string representing the period for which to get the user and open count. Possible values are `today`, `yesterday`, `7d`, `30d`, `this_month`, `last_month`, `this_year`, `last_year`, `month_to_date`, `year_to_date`, `last_12_months`. Default is `all` (all time).

- `icon_size` (optional): An integer representing the size of the icons to return. Possible values are `null`, `16`, `32`, `64`, `128`, `256`, and `512`. Default is `null` (the original size).

- `limit` (optional): Maximum number of apps to return in a single call.

- `offset` (optional): Skips the given number of apps. Prefer `cursor` for paging through large lists.

- `cursor` (optional): Opts into paginated results. Pass `null` for the first page, then the `cursor` from each page to fetch the next one.

- `includeTotal` (optional): If `true`, the paginated result includes a `total` count of the user's apps.

- `stream` (optional): If `true`, the method returns an async iterator of page objects instead of a promise, for use with `for await ... of`. Combine with `limit` to control the page size, or `cursor` to resume from a previous page. Cannot be combined with `offset`. With `includeTotal`, only the first page carries `total`.

## Return value

A `Promise` that will resolve to an array of all [`App`](/Objects/app/) objects belonging to the user that this app has access to.

When the request includes `cursor` (even `null`), `offset`, or `includeTotal`, the promise instead resolves to a page object:

- `items` (Array): The [`App`](/Objects/app/) objects on this page.
- `cursor` (String) (optional): Present while more pages exist; pass it to the next call.
- `total` (Number) (optional): Total app count, present when `includeTotal` was set.

Requests without pagination params keep returning the full list as a plain array, so existing code is unaffected — under the hood the SDK now fetches it page by page.

With `stream: true`, the method returns an async iterator of page objects instead:

```js
for await (const page of mixt.apps.list({ stream: true })) {
    for (const app of page.items) {
        console.log(app.name);
    }
}
```

## Examples

<strong class="example-title">Create 3 random apps and then list them</strong>

```html;app-list
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        (async () => {
            // (1) Generate 3 random app names
            let appName_1 = mixt.randName();
            let appName_2 = mixt.randName();
            let appName_3 = mixt.randName();

            // (2) Create 3 apps
            await mixt.apps.create(appName_1, 'https://example.com');
            await mixt.apps.create(appName_2, 'https://example.com');
            await mixt.apps.create(appName_3, 'https://example.com');

            // (3) Get all apps (list)
            let apps = await mixt.apps.list();

            // (4) Display the names of the apps
            mixt.print(JSON.stringify(apps.map(app => app.name)));

            // (5) Delete the 3 apps we created earlier (cleanup)
            await mixt.apps.delete(appName_1);
            await mixt.apps.delete(appName_2);
            await mixt.apps.delete(appName_3);
        })();
    </script>
</body>
</html>
```
