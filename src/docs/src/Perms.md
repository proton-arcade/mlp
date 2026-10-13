---
title: Perms
description: Request permissions to access user data and resources with Mixt.js Permissions API
platforms: [websites, apps]
---

The Permissions API enables your application to request access to user data and resources such as email addresses, special folders (Desktop, Documents, Pictures, Videos), apps, subdomains, and other apps' saved data.

There are two methods. [`mixt.perms.request()`](/Perms/request/) asks the user for access, and [`mixt.perms.check()`](/Perms/check/) reports whether they have already granted it without prompting.

Both take the same two arguments: the resource being asked about, and the details that resource needs.

```js
await mixt.perms.request('email');
await mixt.perms.request('folder', { name: 'Documents', access: 'write' });
await mixt.perms.request('apps', { access: 'read' });
await mixt.perms.request('appData', { app: 'contacts', scopes: 'read' });
```

When requesting permissions, users will be prompted to grant or deny access. If a permission has already been granted, the user will not be prompted again. This provides a seamless experience while maintaining user privacy and control.

## Features

<div style="overflow:hidden; margin-bottom: 30px;">
    <div class="example-group active" data-section="request-email"><span>Request Email</span></div>
    <div class="example-group" data-section="request-folder"><span>Request Folder Access</span></div>
    <div class="example-group" data-section="request-apps"><span>Request Apps Access</span></div>
    <div class="example-group" data-section="request-batch"><span>Request Several at Once</span></div>
    <div class="example-group" data-section="check"><span>Check Without Prompting</span></div>
    <div class="example-group" data-section="request-app-data"><span>Use Another App's Data</span></div>
</div>

<div class="example-content" data-section="request-email" style="display:block;">

#### Request access to the user's email address

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <button id="request-email">Request Email Access</button>
    <script>
        document.getElementById('request-email').addEventListener('click', async () => {
            const email = await mixt.perms.request('email');
            if (email) {
                mixt.print(`Email: ${email}`);
            } else {
                mixt.print('Email access denied or not available');
            }
        });
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="request-folder">

#### Request write access to the user's Documents folder

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <button id="request-documents">Request Documents Write Access</button>
    <script>
        document.getElementById('request-documents').addEventListener('click', async () => {
            const documentsPath = await mixt.perms.request('folder', { name: 'Documents', access: 'write' });
            if (documentsPath) {
                mixt.print(`Documents path: ${documentsPath}`);
                // Now you can write to the Documents folder
                await mixt.fs.write(`${documentsPath}/my-file.txt`, 'Hello from Documents!');
                mixt.print('File written to Documents folder');
            } else {
                mixt.print('Documents write access denied');
            }
        });
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="request-apps">

#### Request read access to the user's apps

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <button id="request-apps">Request Apps Read Access</button>
    <script>
        document.getElementById('request-apps').addEventListener('click', async () => {
            const granted = await mixt.perms.request('apps');
            if (granted) {
                mixt.print('Apps read access granted');
                // Now you can list the user's apps
                const apps = await mixt.apps.list();
                mixt.print(`User has ${apps.length} apps`);
            } else {
                mixt.print('Apps read access denied');
            }
        });
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="request-batch">

#### Request several things under one prompt

Pass an array to ask for everything your app needs in one call. Anything already granted is left alone, so the prompt lists only what is missing — and doesn't appear at all when it's all in place.

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <button id="setup">Set Up</button>
    <script>
        document.getElementById('setup').addEventListener('click', async () => {
            const [documents, apps, email] = await mixt.perms.request([
                { resource: 'folder', name: 'Documents', access: 'write' },
                { resource: 'apps' },
                { resource: 'email' },
            ]);
            mixt.print(`Documents: ${documents ?? 'denied'}`);
            mixt.print(`Apps: ${apps ? 'granted' : 'denied'}`);
            mixt.print(`Email: ${email ?? 'denied'}`);
        });
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="check">

#### Check access without prompting

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // Never shows a dialog — it only reports what is already granted.
            const granted = await mixt.perms.check('folder', { name: 'Documents', access: 'write' });
            mixt.print(granted
                ? 'Documents write access is already granted'
                : 'Documents write access has not been granted yet');
        })();
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="request-app-data">

#### Use another app's saved data

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <button id="request-app-data">Use another app's data</button>
    <script>
        document.getElementById('request-app-data').addEventListener('click', async () => {
            const other = await mixt.apps.get('contacts');
            const granted = await mixt.perms.request('appData', { app: other.uid, scopes: 'read' });
            if (granted) {
                const keys = await mixt.kv.list({ appUuid: other.uid });
                mixt.print(`${other.title} has ${keys.length} key(s)`);
            } else {
                mixt.print('Permission denied');
            }
        });
    </script>
</body>
</html>
```

</div>

## Resources

The resource decides which details the call takes and what a request resolves to:

| Resource | Details | `request()` resolves to |
| -------- | ------- | ----------------------- |
| `'email'` | — | The user's email address |
| `'folder'` | `{ name, access }` | The folder's path |
| `'apps'` | `{ access }` | `true` if granted |
| `'subdomains'` | `{ access }` | `true` if granted |
| `'appData'` | `{ app, scopes }` | `true` if granted |
| `'appRootDir'` | `{ app, access }` | The app's root directory, or `undefined` if denied |
| `'permission'` | `{ permission }` or `{ permissions }` | `true` if granted |

Anything denied resolves to a falsy value, so one `if` covers both outcomes. `access` is `'read'` (the default) or `'write'`.

## Functions

- **[`mixt.perms.request()`](/Perms/request/)** - Request access to a resource, or to several at once
- **[`mixt.perms.check()`](/Perms/check/)** - Report whether access is already granted, without prompting

## Guides

- **[Using another app's data](/Perms/appData/)** - Reading and writing another app's key-value data and `AppData` files
