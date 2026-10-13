---
title: mixt.auth.isSignedIn()
description: Check if a user is currently signed into the application with their Mixt OS account.
platforms: [websites, apps, nodejs, workers]
---

Checks whether the user is signed into the application.

## Syntax

```js
mixt.auth.isSignedIn()
```

## Parameters

None

## Return value

Returns `true` if the user is signed in, `false` otherwise.

## Example

```html;auth-is-signed-in
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        mixt.print(`Sign in status: ${mixt.auth.isSignedIn()}`);
    </script>
</body>
</html>
```
