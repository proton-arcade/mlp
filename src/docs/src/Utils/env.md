---
title: mixt.env
description: Returns the environment in which Mixt.js is being used.
platforms: [websites, apps, nodejs, workers]
---

A property of the `mixt` object that returns the environment in which Mixt.js is being used.

## Syntax

```js
mixt.env
```

## Return value

A string containing the environment in which Mixt.js is being used:

- `app` - Mixt.js is running inside a Mixt OS application. e.g. `https://mixt.mpl/app/editor`

- `web` - Mixt.js is running inside a web page outside of the Mixt OS environment. e.g. `https://example.com/index.html`

- `gui` - Mixt.js is running inside the Mixt OS GUI. e.g. `https://mixt.mpl/`

- `nodejs` - Mixt.js is running in Node.js.

- `web-worker` - Mixt.js is running inside a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API).

- `service-worker` - Mixt.js is running inside a [Mixt OS Worker](/Workers/). Serverless workers execute in a service worker global scope, which is what this value reports.

## Examples

<strong class="example-title">Get the environment in which Mixt.js is running</strong>

<div style="position: relative;">

```html
<html>
  <body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
      mixt.print("Environment: " + mixt.env);
    </script>
  </body>
</html>
```

</div>
