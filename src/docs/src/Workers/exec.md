---
title: mixt.workers.exec()
description: Call a worker as the calling user, while the worker's code acts on the worker owner's shared KV and storage.
platforms: [websites, apps, nodejs]
---

Sends a request to a worker endpoint while automatically passing the user's session.

<div class="info">
Unlike standard <code>fetch()</code>, <code>mixt.workers.exec()</code> automatically includes the user's session. This provides the worker with the <strong>user context</strong> (<code>user.mixt</code>), enabling the <a href="/user-pays-model/">User-Pays model</a>.
</div>

## Syntax

```js
mixt.workers.exec(workerURL, options)
```

## Parameters

#### `workerURL` (String | URL | Request)(Required)

The worker to execute. Accepts the same input as the Fetch API's first argument: a URL string, a [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) object, or a [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object. When a `Request` object is provided, its options (method, headers, body, etc.) are used and the `options` argument can be omitted.

#### `options` (Object)

A standard [RequestInit](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit) object

## Return Value

A `Promise` that resolves to a `Response` object (similar to the Fetch API).

## Examples

<strong class="example-title">Execute a worker</strong>

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // Execute a worker and get the response
            const response = await mixt.workers.exec('https://my-worker.mixt.work');
            const data = await response.text();
            mixt.print(`Response: ${data}`);
        })();
    </script>
</body>
</html>
```
