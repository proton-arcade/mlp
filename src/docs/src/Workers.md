---
title: Serverless Workers
description: Run server-side JavaScript in the cloud. Use workers when your app needs a backend, so all users read and write the same database, storage, and other resources.
---

Serverless Workers are serverless functions that run JavaScript code in the cloud.

Workers run server-side, which makes them a good fit for centralized application data and backend logic. See [Integration with Mixt.js](/Workers/router/#integration-with-mixt-js) for how worker code accesses Mixt OS resources.

<div class="info">A worker runs as an app, and that identity is what its <code>mixt.kv</code> and <code>AppData</code> access is scoped to. Workers running as the same app share one namespace — see <a href="/Workers/create/#worker-identity-and-shared-state">Worker identity and shared state</a> before you deploy more than one.</div>

## Router

Workers use a router-based system to handle HTTP requests and can integrate with Mixt OS's cloud services like file storage and key-value databases. Workers are perfect for building backend services, REST APIs, webhooks, shared data stores, and data processing pipelines.

### Examples

<div style="overflow:hidden; margin-bottom: 30px;">
    <div class="example-group active" data-section="hello"><span>Hello World</span></div>
    <div class="example-group" data-section="json"><span>POST request</span></div>
    <div class="example-group" data-section="url-params"><span>URL Parameters</span></div>
    <div class="example-group" data-section="json-resp"><span>JSON Response</span></div>
    <div class="example-group" data-section="integration"><span>Mixt.js API Integration</span></div>
</div>

<div class="example-content" data-section="hello" style="display:block;">

#### Simple GET endpoint

```js
// Simple GET endpoint
router.get("/api/hello", async ({ request }) => {
  return { message: "Hello, World!" };
});
```

</div>

<div class="example-content" data-section="json">

#### Handle POST request and get JSON body

```js
router.post("/api/user", async ({ request }) => {
  // Get JSON body
  const body = await request.json();
  return { processed: true };
});
```

</div>

<div class="example-content" data-section="url-params">

#### Using `:paramName` in route path to capture dynamic segments

```js
// Dynamic route with parameters
router.get("/api/posts/:category/:id", async ({ request, params }) => {
  const { category, id } = params;
  return { category, id };
});
```

</div>

<div class="example-content" data-section="json-resp">

#### Return JSON response

```js
router.get("/api/simple", async ({ request }) => {
  return { status: "ok" }; // Automatically converted to JSON
});
```

</div>

<div class="example-content" data-section="integration">

#### Integrate with any Mixt.js API

```js
router.post("/api/kv/set", async ({ request }) => {
  const { key, value } = await request.json();

  if (!key || value === undefined) {
    return new Response(JSON.stringify({ error: "Key and value required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await me.mixt.kv.set("myscope_" + key, value); // add a mandatory prefix so this wont blindly read the KV of the user's other data
  return { saved: true, key };
});

router.get("/api/kv/get/:key", async ({ request, params }) => {
  const key = params.key;
  const value = await me.mixt.kv.get("myscope_" + key); // use the same prefix

  if (!value) {
    return new Response(JSON.stringify({ error: "Key not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { key, value: value };
});
```

</div>

### Object

- **[`router`](/Workers/router/)** - The router object for handling HTTP requests

### Tutorials

- [How to Run Serverless Functions on Mixt OS](https://developer.mixt.mpl/tutorials/serverless-functions-on-mixt/)

## Workers API

In addition, the Mixt.js Workers API lets you create, manage, and execute these workers programmatically. The API provides comprehensive management features including create, delete, list, get, and execute worker.

### Functions

These workers management features are supported out of the box when using Mixt.js:

- **[`mixt.workers.create()`](/Workers/create/)** - Create a new worker
- **[`mixt.workers.delete()`](/Workers/delete/)** - Delete a worker
- **[`mixt.workers.list()`](/Workers/list/)** - List all workers
- **[`mixt.workers.get()`](/Workers/get/)** - Get information about a specific worker
- **[`mixt.workers.exec()`](/Workers/exec/)** - Execute a worker

### Examples

You can see various Mixt.js workers management features in action from the following examples:

- [Create a worker](/playground/workers-create/)
- [List workers](/playground/workers-list/)
- [Get a worker](/playground/workers-get/)
- [Workers Management](/playground/workers-management/)
- [Authenticated Worker Requests](/playground/workers-exec/)

## Deployment

Once your worker is ready, you can put it online on a free `*.mixt.work` subdomain.

<div class="info">A worker is created once and keeps its name and URL. To ship changes, overwrite its source file rather than creating a new worker — see <a href="/Workers/create/#updating-a-worker">Updating a worker</a>.</div>

### Publish from mixt.mpl

The quickest way to publish a worker is to create it on [mixt.mpl](https://mixt.mpl) and publish it.

<ol>
    <li>
        Create a <code>.js</code> file containing your worker code.
        <figure style="margin: 30px 0;">
            <img src="https://developer.mixt.mpl/assets/img/workers/code.webp" style="width: 100%; max-width: 600px; margin: 0 auto; display: block; border-radius: 6px;">
        </figure>
    </li>
    <li>
        Right-click the file and choose <strong>Publish as Worker</strong>.
        <figure style="margin: 30px 0;">
            <img src="https://developer.mixt.mpl/assets/img/workers/publish-workers.webp" style="width: 100%; max-width: 600px; margin: 0 auto; display: block; border-radius: 6px;">
        </figure>
    </li>
    <li>
        Pick a name and click <strong>Publish</strong>. Your worker is live at <code>https://your-worker.mixt.work</code>.
        <figure style="margin: 30px 0;">
            <img src="https://developer.mixt.mpl/assets/img/workers/published.webp" style="width: 100%; max-width: 600px; margin: 0 auto; display: block; border-radius: 6px;">
        </figure>
    </li>
</ol>

### Deploy with the Mixt OS CLI

You can also deploy straight from the terminal with the [Mixt OS CLI](https://www.npmjs.com/package/@mixt/cli).

Install it globally:

```
npm install -g @mixt/cli
```

Then deploy your worker's JavaScript file to a `*.mixt.work` subdomain:

```
mixt worker deploy [file] [name]
```

Both arguments are optional — run `mixt worker deploy` with no arguments and the CLI prompts you for the file and worker name.

<div class="info">The Mixt OS CLI is currently in beta (0.x), so commands and behavior may change.</div>

### Automate with GitHub Actions

If your worker's code lives on GitHub, you can redeploy it automatically on every push using the [Mixt OS Worker Deploy Action](https://github.com/proton-arcade/mlp-worker-deploy-action).

Add a workflow file at `.github/workflows/deploy-worker.yml`:

```yaml
name: Deploy Worker to Mixt OS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy worker
        uses: proton-arcade/mlp-worker-deploy-action@v1.0.1
        with:
          worker_name: my-api             # publishes to my-api.mixt.work
          mixt_path: ~/Workers/my-api/   # where to store the files on Mixt OS
          source_path: worker             # the folder containing your worker
          entry_file: index.js            # the worker's entry file
          mixt_token: ${{ secrets.MIXT_TOKEN }}
```

<div class="info">Create a new repository secret named <code>MIXT_TOKEN</code> and set its value to your Mixt OS auth token (see <a href="https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#creating-secrets-for-a-repository">creating secrets for a repository</a>). To get your auth token, follow the <a href="https://developer.mixt.mpl/tutorials/mixt-auth-token/">Mixt OS auth token tutorial</a>.</div>
