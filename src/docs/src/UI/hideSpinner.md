---
title: mixt.ui.hideSpinner()
description: Hides the active spinner instance.
platforms: [ websites, apps]
---

Hides the active spinner instance.

## Syntax
```js
mixt.ui.hideSpinner()
```

## Examples

```html;ui-spinner
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        // show the spinner
        mixt.ui.showSpinner();

        // hide the spinner after 3 seconds
        setTimeout(()=>{
            mixt.ui.hideSpinner();
        }, 3000);
    </script>
</body>
</html>
```