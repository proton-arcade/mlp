---
title: mixt.perms.check()
description: Check whether access has already been granted, without prompting the user.
platforms: [websites, apps]
---

Ask whether access is already granted. Nothing is prompted and nothing is changed; this only reports what the user has already allowed.

Use it to keep prompts out of the way until they are needed: show a feature as available when the access is in place, and offer an opt-in only where it is not.

It takes the same resources and details as [`mixt.perms.request()`](/Perms/request/). Both read the same state, so a `true` here means the matching `request()` won't prompt for that access. In the array form that is per entry: a batch still prompts if any one entry is missing.

## Syntax

```js
mixt.perms.check(resource)
mixt.perms.check(resource, details)
mixt.perms.check(requests)
```

## Parameters

The same as [`mixt.perms.request()`](/Perms/request/) — see the resource table there for what each one accepts. `create` is accepted and validated for signature symmetry, but `check()` never creates anything — it only ever reports whether access is already held. An invalid `create` value rejects with `{ message, code: 'invalid_argument' }`, the same as `request()`.

## Return value

A `Promise` that resolves to `true` if the access is already granted, or `false` otherwise. The array form resolves to an array of booleans, in the order asked.

Where a resource needs more than one permission — `'appData'` with several scopes, or `'permission'` with a list — the answer is `true` only when the whole set is granted. A partly-granted set answers `false`, since a prompt is still needed.

The promise rejects if the check itself cannot be made (for example when the caller isn't signed in). A failure is not reported as `false`: an app that couldn't tell the two apart would prompt someone who had already granted it.

## Examples

<strong class="example-title">Only ask when the access is missing</strong>

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <button id="save">Save to Documents</button>
    <script>
        document.getElementById('save').addEventListener('click', async () => {
            const details = { name: 'Documents', access: 'write' };
            if (!await mixt.perms.check('folder', details)) {
                if (!await mixt.perms.request('folder', details)) {
                    mixt.print('Documents write access denied');
                    return;
                }
            }
            const user = await mixt.auth.getUser();
            await mixt.fs.write(`/${user.username}/Documents/notes.txt`, 'Saved!');
            mixt.print('Saved');
        });
    </script>
</body>
</html>
```

<strong class="example-title">Report what is still missing</strong>

```html
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <button id="status">Check Setup</button>
    <script>
        document.getElementById('status').addEventListener('click', async () => {
            const wanted = [
                { resource: 'folder', name: 'Documents', access: 'write' },
                { resource: 'apps' },
                { resource: 'email' },
            ];
            const granted = await mixt.perms.check(wanted);
            wanted.forEach((entry, i) => {
                mixt.print(`${entry.resource}: ${granted[i] ? 'granted' : 'not granted'}`);
            });
        });
    </script>
</body>
</html>
```
