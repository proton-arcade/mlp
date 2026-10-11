---
title: mixt.ui.setWindowWidth()
description: Dynamically sets the width of the window.
platforms: [apps]
---

Allows the user to dynamically set the width of the window.

## Syntax
```js
mixt.ui.setWindowWidth(width)
mixt.ui.setWindowWidth(width, window_id)
```

## Parameters

#### `width` (Float)
The new width for this window. Must be a positive number. Minimum width is 200px, if a value less than 200 is provided, the width will be set to 200px.

#### `window_id` (optional)
Targets a specific window other than the app's main window. Accepts either a window id string or a window handle returned by [`mixt.ui.createWindow()`](/UI/createWindow/) (an object with an `id` property). When omitted, the app's main window is used.

## Examples

```html
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        // sets the width of the window to 800px
        mixt.ui.setWindowWidth(800);
    </script>
</body>
</html>
```