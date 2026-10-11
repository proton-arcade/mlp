---
title: mixt.ui.authenticateWithMixt()
description: Presents a dialog to the user to authenticate with their Mixt OS account.
platforms: [websites, apps]
---

Presents a dialog to the user to authenticate with their Mixt OS account.

## Syntax

```js
mixt.ui.authenticateWithMixt()
```

## Parameters

None.

## Return value

A `Promise` that resolves once the user is authenticated with their Mixt OS account. If the user cancels the dialog, the promise will be rejected with an error.

## Examples

```html
<html>
  <body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
      // Presents a dialog to the user to authenticate with their Mixt OS account.
      mixt.ui
        .authenticateWithMixt()
        .then(() => {
          console.log("Authentication success!");
        })
        .catch((error) => {
          console.error("Authentication failed: ", error);
        });
    </script>
  </body>
</html>
```
