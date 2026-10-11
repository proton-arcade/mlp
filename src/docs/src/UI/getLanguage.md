---
title: mixt.ui.getLanguage()
description: Retrieves the current language/locale code from the Mixt OS environment.
platforms: [apps]
---

Retrieves the current language/locale code from the Mixt OS environment. This function communicates with the host environment to get the active language setting.

## Syntax
```js
mixt.ui.getLanguage()
```

## Parameters

This function takes no parameters.

## Return value 
A `Promise` that resolves to a string containing the current language code (e.g., `en`, `fr`, `es`, `de`).

## Examples
```html
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        // Get the current language
        mixt.ui.getLanguage().then((language) => {
            console.log('Current language:', language);
            // Output: "Current language: fr" (if French is selected)
        });

        // Using async/await syntax
        async function displayLanguage() {
            const currentLang = await mixt.ui.getLanguage();
            document.body.innerHTML = `<h1>Current language: ${currentLang}</h1>`;
        }
        
        displayLanguage();

        // Listen for language changes and update accordingly
        mixt.ui.on('localeChanged', async (data) => {
            console.log('Language changed to:', data.language);
            const updatedLang = await mixt.ui.getLanguage();
            console.log('Confirmed current language:', updatedLang);
        });
    </script>
</body>
</html>
```