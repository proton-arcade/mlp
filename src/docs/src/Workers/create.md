---
title: mixt.workers.create()
description: Create and deploy a worker from a JavaScript file, giving your app one shared server-side backend.
platforms: [websites, apps, nodejs, workers]
---

Creates and deploys a new worker from a JavaScript file containing [router](/Workers/router/) code.

A worker is tied to its **name**: you create it **once** and keep that name. To deploy changes, don't call `create()` again with a new name — instead overwrite the worker's source file (see [Updating a worker](#updating-a-worker) below). Recreating under a different name leaves the old worker live at its old URL while your callers end up pointing at an orphaned one.

<div class="info">To create a worker, you'll need a <a href="https://mixt.mpl/">Mixt OS account</a> with a verified email address. After a worker is created or updated, full propagation may take between 5 and 30 seconds to take effect across all edge servers.</div>

## Syntax

```js
mixt.workers.create(workerName, filePath)
mixt.workers.create(workerName, filePath, appName)
mixt.workers.create(workerName, filePath, options)
```

## Parameters

<div class="info">Workers cannot be larger than <strong>10MB</strong>.</div>

#### `workerName` (String)(Required)
The name for the worker. It can contain letters, numbers, hyphens, and underscores.

#### `filePath` (String)(Required)
The path to a JavaScript file in your Mixt OS account that contains your [router](/Workers/router/) code.

#### `appName` (String)(Optional)
The name of an existing app in your account to bind the worker to. The worker then runs as that app, and no sandbox app is created.

When your code is itself running as a Mixt OS app, you may only name an app that **your app created** — apps you didn't create are rejected with a `403`. Deploying from the GUI or with a user token, you may name any app in your account.

#### `options` (Object)(Optional)
An alternative to `appName` for controlling the worker's sandbox.

- `sandbox` (Boolean)(Optional) - Whether to give the worker its own isolated sandbox app. When `true`, a dedicated `sandbox-<workerName>` app is created (or reused) to own the worker. The default depends on how you're authenticated:
  - **Deploying as an app** (your code runs inside a Mixt OS app): defaults to `false`. The worker runs as your app.
  - **Deploying with a user token** (the GUI, a root access token): defaults to `true`. Most people deploying workers this way never need to think about it.

## Worker identity and shared state

Every worker runs as some app, and that identity decides which [`mixt.kv`](/KV/) namespace and which `AppData` directory the worker reaches. Two workers running as the same app read and write **the same** KV keys and the same files.

<div class="info"><strong>Without a sandbox, workers share state.</strong> When an app deploys several workers without <code>sandbox: true</code>, all of them run as that app — so they share one KV namespace and one AppData directory with each other <em>and</em> with the app's own frontend. A key one worker writes is a key every other worker can read and overwrite. If your workers are meant to be independent (for example, one per project your app generates), deploy them with <code>sandbox: true</code> or bind each to its own app with <code>appName</code>.</div>

Sandboxing is the way to keep them apart:

```js
// Each of these gets its own app identity, so their KV and AppData
// are completely separate from each other and from the deploying app.
await mixt.workers.create('project-alpha-api', 'api.js', { sandbox: true });
await mixt.workers.create('project-beta-api', 'api.js', { sandbox: true });
```

Two identities are in play inside a worker, and only the first is affected by this setting:

- `mixt.*` (also `me.mixt`) — the **worker's own** identity, set by the binding above.
- `user.mixt.*` — the identity of **whoever called the worker** via [`mixt.workers.exec()`](/Workers/exec/). If an app calls a worker, this is that calling app's namespace, regardless of which app the worker itself runs as.

Changing a worker's binding does not migrate its data. A worker redeployed with a different `sandbox` setting or `appName` starts against a different namespace, and anything it wrote under the old identity stays where it was.

## Return Value

A `Promise` that resolves to a [`WorkerDeployment`](/Objects/workerdeployment) object on success.

On failure, throws an `Error` with the reason.

## Examples

<strong class="example-title">Basic Syntax</strong>

```js
// Create a new worker from a file in your Mixt OS account
mixt.workers.create('my-api', 'api-server.js')
    .then(result => {
        console.log(`Worker deployed at: ${result.url}`);
    })
    .catch(error => {
        console.error('Deployment failed:', error.message);
    });
```

<strong class="example-title">Complete Example</strong>

```html;workers-create
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
    (async () => {
        // 1. Create a worker file in your Mixt OS account.
        mixt.print('→ Writing the worker code to my-worker.js<br>');
        const workerCode = `
        // A router for /api/hello
        router.get('/api/hello', async (event) => {
            return 'Hello from worker!';
        });
        `;

        // Save the worker code to my-worker.js in your Mixt OS account
        await mixt.fs.write('my-worker.js', workerCode);

        // 2. Deploy the worker using the file path
        const workerName = mixt.randName();
        mixt.print(`→ Deploying ${workerName} worker. May take up to 10 seconds to deploy.<br>`);
        const deployment = await mixt.workers.create(workerName, 'my-worker.js');
        
        // 3. Test the worker
        mixt.print(`→ Wait 5 seconds before testing the worker to make sure it's propagated.<br>`);

        setTimeout(async ()=>{
            const response = await fetch(`${deployment.url}/api/hello`);
            mixt.print('→ Test response: ', await response.text());
        }, 5000);
    })();
    </script>
</body>
</html>
```

## Updating a worker

A worker keeps the same name and URL for its whole lifetime. You create it once with `create()`; after that, you **update it by overwriting its source file**, not by creating a new worker.

[`mixt.workers.get()`](/Workers/get/) returns the worker's [`file_path`](/Objects/workerinfo), so you can write your new code back to it:

```js
// Look up the deployed worker's source file
const info = await mixt.workers.get('my-api');

// Overwrite it with your new code — this redeploys the worker
// at the same name and URL
await mixt.fs.write(info.file_path, updatedWorkerCode);
```

The worker redeploys from that file, so `https://my-api.mixt.work` keeps serving — now running your updated code. Anything already calling the worker keeps working without changes.