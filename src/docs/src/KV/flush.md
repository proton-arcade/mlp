---
title: mixt.kv.flush()
description: Remove all key-value pairs from the user's own store for your app.
platforms: [websites, apps, nodejs, workers]
---

Will remove all key-value pairs from the user's key-value store for the current app.

## Syntax
```js
mixt.kv.flush()
```

## Parameters
None

## Return value
A `Promise` that will resolve to `true` when the key-value store has been flushed (emptied), or reject with an error on failure.

## Examples

```html;kv-flush
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a number of key-value pairs
            await mixt.kv.set('name', 'Mixt OS Smith');
            await mixt.kv.set('age', 21);
            await mixt.kv.set('isCool', true);
            mixt.print("Key-value pairs created/updated<br>");

            // (2) Rretrieve all keys
            const keys = await mixt.kv.list();
            mixt.print(`Keys are: ${keys}<br>`);

            // (3) Flush the key-value store
            await mixt.kv.flush();
            mixt.print('Key-value store flushed<br>');

            // (4) Retrieve all keys again, should be empty
            const keys2 = await mixt.kv.list();
            mixt.print(`Keys are now: ${keys2}<br>`);
        })();
    </script>
</body>
```
