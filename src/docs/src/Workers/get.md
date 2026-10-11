---
title: mixt.workers.get()
description: Get information about a specific worker.
platforms: [websites, apps, nodejs, workers]
---

Gets the information for a specific worker.

## Syntax

```js
mixt.workers.get(workerName)
```

## Parameters

#### `workerName` (String)(Required)

The name of the worker to get the information for.

## Return Value

A `Promise` that resolves to a [`WorkerInfo`](/Objects/workerinfo) object if the worker exists, or `undefined` otherwise.

## Examples

<strong class="example-title">Basic Usage</strong>

```html;workers-get
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // Get a worker's information
            const workerInfo = await mixt.workers.get('my-api');
            if (workerInfo) {
                mixt.print(`Worker information: ${JSON.stringify(workerInfo, null, 2)}`);
            } else {
                mixt.print('Worker not found!');
            }
        })();
    </script>
</body>
</html>
```
