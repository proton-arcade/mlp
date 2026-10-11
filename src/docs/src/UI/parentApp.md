---
title: mixt.ui.parentApp()
description: Obtains a connection to the app that launched this app.
platforms: [apps]
---

Obtain a connection to the app that launched this app.

## Syntax
```js
mixt.ui.parentApp()
```

## Parameters
`mixt.ui.parentApp()` does not accept any parameters.

## Return value 
An [`AppConnection`](/Objects/AppConnection) to the parent, or null if there is no parent app.

## Examples

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        const parent = mixt.ui.parentApp();
        if (!parent) {
            alert('This app was launched directly');
        } else {
            alert('This app was launched by another app');
            parent.postMessage("Hello, parent!");
        }
    </script>
</body>
</html>
```
