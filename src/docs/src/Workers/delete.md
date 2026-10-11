---
title: mixt.workers.delete()
description: Delete workers and stop their execution.
platforms: [websites, apps, nodejs, workers]
---

Deletes an existing worker and stops its execution.

## Syntax

```js
mixt.workers.delete(workerName)
```

## Parameters

#### `workerName` (String)(Required)
The name of the worker to delete.

## Return Value

A `Promise` that resolves to `true` if successful, or throws an `Error` if the operation fails.

## Examples

<strong class="example-title">Basic Worker Deletion</strong>

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random worker
            let workerName = mixt.randName();
            await mixt.fs.write('example-worker.js')
            const worker = await mixt.workers.create(workerName, 'example-worker.js')
            mixt.print(`Worker deployed at: ${worker.url} (This is an empty worker with no code)<br>`);

            // (2) Delete the worker using delete()
            const worker2 = await mixt.workers.delete(workerName);
            mixt.print('Worker deleted<br>');

            // (3) Try to retrieve the worker (should fail)
            mixt.print('Trying to retrieve worker... (should fail)<br>');
            const workerInfo = await mixt.workers.get(workerName);
            if (workerInfo) {
                mixt.print("Worker found (not deleted)!")
            } else {
                mixt.print('Worker could not be retrieved<br>');
            }
        })();
    </script>
</body>
</html>
```
