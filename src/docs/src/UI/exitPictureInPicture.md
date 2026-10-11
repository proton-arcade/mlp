---
title: mixt.ui.exitPictureInPicture()
description: Closes the picture-in-picture window your app opened.
platforms: [apps]
---

Closes the picture-in-picture window opened with [`mixt.ui.requestPictureInPicture()`](/UI/requestPictureInPicture/), if one is up. Its `onClose` callback does not run for this — you asked for the close.

## Syntax
```js
mixt.ui.exitPictureInPicture()
```

## Return value
A `Promise` that resolves to `true` if there was a window to close, `false` otherwise.

## Examples

```html
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <button id="exit">Exit picture-in-picture</button>
    <script>
        document.getElementById('exit').onclick = async () => {
            const wasOpen = await mixt.ui.exitPictureInPicture();
            console.log(wasOpen ? 'closed' : 'nothing was open');
        };
    </script>
</body>
</html>
```
