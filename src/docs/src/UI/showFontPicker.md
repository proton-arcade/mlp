---
title: mixt.ui.showFontPicker()
description: Presents a list of fonts for previewing and selecting.
platforms: [ websites, apps]
---

Presents the user with a list of fonts allowing them to preview and select a font.

## Syntax
```js
mixt.ui.showFontPicker()
mixt.ui.showFontPicker(defaultFont)
mixt.ui.showFontPicker(options)
```

## Parameters
#### `defaultFont` (String)
The default font to select when the font picker is opened.


## Examples

```html;ui-show-font-picker
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <h1>A cool Font Picker demo!</h1>

    <script>
        mixt.ui.showFontPicker().then((font)=>{
            document.body.style.fontFamily = font.fontFamily;
        })
    </script>
</body>
</html>
```