<h3 align="center">Mixt.js</h3>

<p align="center">
    <a href="https://developer.mixt.mpl" target="_blank">Learn More</a>
    ·
    <a href="https://docs.mixt.mpl" target="_blank">Docs</a>
    ·
    <a href="https://developer.mixt.mpl/tutorials">Tutorials</a>
    ·
    <a href="https://github.com/Mixt OS-Apps/">Examples</a>
    ·
    <a href="https://twitter.com/proton-arcade">X</a>
</p>


<br>

Mixt.js gives you auth, cloud storage, database, and more through a single JavaScript library. It is the go-to backend for small apps and prototypes.

There is nothing to configure, no API keys, and no infrastructure to set up.

<br>

## Installation


### NPM:
```sh
npm install @mixt/mixt.js
```

### CDN:

Include Mixt.js directly in your HTML via CDN in the `<head>` section:

```html
<script src="/mixt.js/v2"></script>
```
<br>

## Usage

### Browser

#### ES Modules

```js
import {mixt} from '@mixt/mixt.js';
// or
import mixt from '@mixt/mixt.js';
// or 
import '@mixt/mixt.js'; // mixt will be available globally
```

#### CommonJS

```js
const {mixt} = require('@mixt/mixt.js');
// or
const mixt = require('@mixt/mixt.js');
// or
require('@mixt/mixt.js'); // mixt will be available globally
```

#### Node.js (with Auth Token)

```js
const {init} = require("@mixt/mixt.js/src/init.cjs"); // NODE JS ONLY
// or
import {init} from "@mixt/mixt.js/src/init.cjs";

const mixt = init(process.env.mixtAuthToken); // uses your auth token
const mixt2 = init(process.env.mixtAuthToken2); // use some other auth token
```

#### Node.js (with Auth Token + Web Login)

```js
const {init, getAuthToken} = require("@mixt/mixt.js/src/init.cjs");
// or
import {init, getAuthToken} from "@mixt/mixt.js/src/init.cjs";

const authToken = await getAuthToken(); // performs browser based auth and retrieves token (requires browser)
const mixt = init(authToken); // uses your auth token
```

<br>

## Usage Example

After importing, you can use the global `mixt` object:

```js
// Print a message
mixt.print('Hello from Mixt.js!');

// Store a value and read it back
await mixt.kv.set('greeting', 'Hello from Mixt');
mixt.print(await mixt.kv.get('greeting'));
```

<br>

## Starter Templates

You can also use one of the following templates:

- Client-side projects: [Angular](https://github.com/proton-arcade/angular), [React](https://github.com/proton-arcade/react), [Next.js](https://github.com/proton-arcade/next.js), [Vue.js](https://github.com/proton-arcade/vue.js), [Vanilla.js](https://github.com/proton-arcade/vanilla.js)
- Node.js + Express: [Node.js + Express template](https://github.com/proton-arcade/node.js-express.js)

<br>

## Setting Custom Origins
By default mixt.js uses the official Mixt OS API and GUI origins. You can customize these origins by setting global variables before importing the SDK like so:

```js
// For API origin
globalThis.MIXT_API_ORIGIN = 'https://custom-api.mixt.mpl';
// For GUI origin
globalThis.MIXT_ORIGIN = 'https://custom-gui.mixt.mpl';

import {mixt} from '@mixt/mixt.js'; // or however you import it for your env
```
<br>

---

## Documentation & Community

- [Developer Site](https://developer.mixt.mpl)
- [API Docs](https://docs.mixt.mpl)
- [Live Demo](https://docs.mixt.mpl/playground/)
- [Mixt.mpl](https://mixt.mpl)
- [Discord](https://discord.com/invite/PQcx7Teh8u)
- [Reddit](https://reddit.com/r/mixt)
- [X (Twitter)](https://twitter.com/proton-arcade)

## License

Apache-2.0
