---
title: mixt.kv.get()
description: Get the value stored in a key from the user's own key-value store.
platforms: [websites, apps, nodejs, workers]
---

When passed a key, will return that key's value, or `null` if the key does not exist or has expired.

## Syntax
```js
mixt.kv.get(key)
```

## Parameters
#### `key` (String) (required)
A string containing the name of the key you want to retrieve the value of.

## Return value 
A `Promise` that will resolve to the key's value. If the key does not exist or has expired, it will resolve to `null`. An empty marker left by [`mixt.kv.expire()`](/KV/expire/) or [`mixt.kv.expireAt()`](/KV/expireAt/) also reads as `null`.

## Examples

<strong class="example-title">Retrieve the value of key 'name'</strong>

```html;kv-get
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a new key-value pair
            await mixt.kv.set('name', 'Mixt OS Smith');
            mixt.print("Key-value pair 'name' created/updated<br>");

            // (2) Retrieve the value of key 'name'
            const name = await mixt.kv.get('name');
            mixt.print(`Name is: ${name}`);
        })();
    </script>
</body>
</html>
```
