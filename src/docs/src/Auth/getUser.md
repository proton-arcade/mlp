---
title: mixt.auth.getUser()
description: Retrieve the authenticated user basic information.
platforms: [websites, apps, nodejs, workers]
---

Returns the user's basic information.

## Syntax

```js
mixt.auth.getUser()
```

## Parameters

None

## Return value

A promise that resolves to a [`User`](/Objects/user) object containing the user's basic information.

## Example

```html;auth-get-user
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        mixt.auth.getUser().then(function(user) {
            mixt.print(JSON.stringify(user));
        });
    </script>
</body>
</html>
```
