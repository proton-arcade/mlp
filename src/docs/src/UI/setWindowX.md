---
title: mixt.ui.setWindowX()
description: Sets the X position of the window.
platforms: [apps]
---

Sets the X position of the window.

## Syntax
```js
mixt.ui.setWindowX(x)
mixt.ui.setWindowX(x, window_id)
```

## Parameters

#### `x` (Float) (Required)
The new x position for this window.

#### `window_id` (optional)
Targets a specific window other than the app's main window. Accepts either a window id string or a window handle returned by [`mixt.ui.createWindow()`](/UI/createWindow/) (an object with an `id` property). When omitted, the app's main window is used.


## Examples

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        // sets the position of the window to 100px from the left
        mixt.ui.setWindowX(100);
    </script>
</body>
```