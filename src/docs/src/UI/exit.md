---
title: mixt.exit()
description: Terminates the running application and closes its window.
platforms: [apps]
---

Will terminate the running application and close its window.

## Syntax
```js
mixt.exit()
mixt.exit(statusCode)
```

## Parameters

#### `statusCode` (Integer) (optional)
Reports the reason for exiting, with `0` meaning success and non-zero indicating some kind of error. Defaults to `0`.

This value is reported to other apps as the reason that your app exited.
## Examples

```html
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <button id="exit-button">Exit App</button>
    <script>
        const exit_button = document.getElementById('exit-button');
        exit_button.addEventListener('click', () => {
            mixt.exit();
        });
    </script>
</body>
</html>
```
