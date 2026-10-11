---
title: mixt.ui.showColorPicker()
description: Presents a color picker dialog for selecting a color.
platforms: [ websites, apps]
---

Presents the user with a color picker dialog allowing them to select a color.

## Syntax
```js
mixt.ui.showColorPicker()
mixt.ui.showColorPicker(defaultColor)
mixt.ui.showColorPicker(options)
```

## Examples

```html;ui-show-color-picker
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        mixt.ui.showColorPicker().then((color)=>{
            document.body.style.backgroundColor = color;
        })
    </script>
</body>
</html>
```