---
title: Supported Platforms
description: Use Mixt.js on any platform with JavaScript support, including websites, Mixt OS Apps, Node.js, and Serverless Workers.
---

Mixt.js works on any platform with JavaScript support. This includes websites, Mixt OS Apps, Node.js, and Mixt OS Serverless Workers.

## **Websites**

Use Mixt.js in your websites to add powerful features like databases and cloud storage without worrying about infrastructure.

You can use it across all kinds of web development technologies, from static HTML sites and single-page applications (React, Vue, Angular) to full-stack frameworks like Next.js, Nuxt, and SvelteKit, or any JavaScript-based web application.

<div style="overflow:hidden; margin-top: 30px;">
    <div class="example-group active" data-section="npm"><span>NPM module</span></div>
    <div class="example-group" data-section="cdn"><span>CDN (script tag)</span></div>
</div>

<div class="example-content" data-section="npm" style="display:block;">

### Installation via NPM

```plaintext
npm install @mixt/mixt.js
```

<br>

### Importing Mixt.js

```js
// ESM
import { mixt } from "@mixt/mixt.js";
// or
import mixt from "@mixt/mixt.js";

// CommonJS
const { mixt } = require("@mixt/mixt.js");
// or
const mixt = require("@mixt/mixt.js");
```

</div>

<div class="example-content" data-section="cdn">

### Usage via CDN


</div>

### Unsupported contexts

Mixt OS identifies your app by its origin, so a page the browser gives no origin to cannot be signed in:

- **Pages opened straight from disk** (`file:///...`). Serve the file instead — `python3 -m http.server` or `npx http-server` is enough, and `http://localhost` works like any other origin.
- **Iframes sandboxed without `allow-same-origin`.** Add `allow-same-origin` to the `sandbox` attribute, or load Mixt.js from the parent page.

In both cases Mixt.js shows an "Unsupported Origin" dialog on load, and `mixt.auth.signIn()` rejects with [`unsupported_origin`](/Auth/signIn/).

### Starter templates for web

- [Angular](https://github.com/proton-arcade/angular)
- [React](https://github.com/proton-arcade/react)
- [Next.js](https://github.com/proton-arcade/next.js)
- [Vue.js](https://github.com/proton-arcade/vue.js)
- [Vanilla JS](https://github.com/proton-arcade/vanilla.js)

## **Mixt OS Apps**

Mixt OS Apps are web-based applications that run in the [Mixt OS](https://mixt.mpl) web-based operating system.

You can use Mixt.js in Mixt OS Apps just as you would in any website. They have full access to all web capabilities, plus the added benefits of Mixt OS desktop, such as:

- **Automatic authentication** - Users are automatically authenticated in the Mixt OS environment
- **Inter-app communication** - Interact with other Mixt OS apps programmatically
- **File system integration** - Direct access to the user's Mixt OS file system
- **Cloud desktop integration** - Apps run seamlessly in the Mixt OS desktop environment

<figure style="margin: 40px 0;">
    <img src="/assets/img/mixt-screenshot.png" style="width: 100%; max-width: 600px; margin: 0px auto; display:block;">
    <figcaption style="text-align: center; font-size: 13px; color: #777;">Mixt OS cloud desktop environment</figcaption>
</figure>

The Mixt OS ecosystem hosts over 60,000 live applications, from essential tools like Notepad, File Explorer, Code Editor, and many more specialized applications.

## **Node.js**

Mixt.js works seamlessly in Node.js environments, allowing you to integrate databases and cloud storage with your Node.js applications. This makes it ideal for building backend services and APIs, performing server-side data processing, or creating CLI tools and automation scripts.

```js
const { init } = require("@mixt/mixt.js/src/init.cjs");
// or
import { init } from "@mixt/mixt.js/src/init.cjs";

const mixt = init(process.env.mixtAuthToken); // uses your auth token

// Print a greeting
mixt.print("Hello from Mixt!");
```

Get started quickly with the [Node.js + Express template](https://github.com/proton-arcade/node.js-express.js).

<div class="info">If your environment has browser access (e.g. CLI tools), you can use <code>getAuthToken()</code> to obtain a token via web-based login.</div>

## **Serverless Workers**

[Serverless Workers](/Workers/) let you run HTTP servers and backend APIs.

Think of them as your serverless backend and API endpoints. Just like in other serverless platforms, you can use Mixt.js in workers to access cloud storage, key-value stores, and databases.

```js
// Simple GET endpoint
router.get("/api/hello", async ({ request }) => {
  return { message: "Hello, World!" };
});

// POST endpoint with JSON body
router.post("/api/user", async ({ request }) => {
  const body = await request.json();
  return { processed: true };
});
```
