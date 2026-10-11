---
title: mixt.kv.MAX_KEY_SIZE
description: Returns the maximum key size (in bytes) for the key-value store.
platforms: [websites, apps, nodejs, workers]
---

A property of the `mixt.kv` object that returns the maximum key size (in bytes) for the key-value store. A key is measured in UTF-8 bytes, so a key with non-ASCII characters fits fewer characters.

## Syntax

```js
mixt.kv.MAX_KEY_SIZE
```

## Examples

<strong class="example-title">Get the max key size</strong>

```html
<html>
  <body>
    <script src="/mixt.js/v2"></script>
    <script>
      mixt.print("Max Key Size: " + mixt.kv.MAX_KEY_SIZE);
    </script>
  </body>
</html>
```
