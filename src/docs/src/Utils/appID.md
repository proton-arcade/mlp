---
title: mixt.appID
description: Returns the App ID of the running application.
platforms: [websites, apps]
---

A property of the `mixt` object that returns the App ID of the running application.

## Syntax

```js
mixt.appID
```

## Examples

<strong class="example-title">Get the ID of the current application</strong>

<div style="position: relative;">

```html
<html>
  <body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
      mixt.print("App ID: " + mixt.appID);
    </script>
  </body>
</html>
```

</div>
