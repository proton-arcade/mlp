---
title: mixt.ui.setWindowTitle()
description: Dynamically sets the title of the window.
platforms: [apps]
---

Allows the user to dynamically set the title of the window.

## Syntax
```js
mixt.ui.setWindowTitle(title)
mixt.ui.setWindowTitle(title, window_id)
```

## Parameters

#### `title` (String)
The new title for this window.

#### `window_id` (optional)
Targets a specific window other than the app's main window. Accepts either a window id string or a window handle returned by [`mixt.ui.createWindow()`](/UI/createWindow/) (an object with an `id` property). When omitted, the app's main window is used.

## Examples

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        mixt.ui.setWindowTitle('Fancy New Title');
    </script>
</body>
</html>
```