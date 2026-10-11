---
title: mixt.randName()
description: Generate a random domain-safe name.
platforms: [websites, apps, nodejs, workers]
---

A function that generates a domain-safe name by combining a random adjective, a random noun, and a random number (between 0 and 9999). The result is returned as a string with components separated by hyphens by default. You can change the separator by passing a string as the first argument to the function.

## Syntax

```js
mixt.randName()
mixt.randName(separator)
```

## Parameters

#### `separator` (String)

The separator to use between components. Defaults to `-`.

## Examples

<strong class="example-title">Generate a random name</strong>

<div style="position: relative;">

```html
<html>
  <body>
    <script src="/mixt.js/v2"></script>
    <script>
      mixt.print(mixt.randName());
    </script>
  </body>
</html>
```

</div>
