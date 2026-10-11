---
title: mixt.kv.MAX_VALUE_SIZE
description: Returns the maximum value size (in bytes) for the key-value store.
platforms: [websites, apps, nodejs, workers]
---

A property of the `mixt.kv` object that returns the maximum value size (in bytes) for the key-value store. A value is measured as the UTF-8 bytes of `JSON.stringify(value)`, so a string's quotes and escapes count.

## Syntax

```js
mixt.kv.MAX_VALUE_SIZE
```

## Examples

<strong class="example-title">Get the max value size</strong>

```html
<html>
  <body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
      mixt.print("Max Value Size: " + mixt.kv.MAX_VALUE_SIZE);
    </script>
  </body>
</html>
```
