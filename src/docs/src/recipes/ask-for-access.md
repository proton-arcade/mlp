---
title: Ask for Access
description: "Learn how to request permissions with Mixt.js to let your app use the user's folders, apps, subdomains and email address."
tags: [perms, auth]
order: 15
---

A Mixt OS app runs in a sandbox. By default it can only use the files and
resources it created itself. When your app needs something outside that sandbox,
such as the user's Documents folder or their email address, it asks the user
with the [permissions API](/Perms/). The user sees a prompt and approves or
declines it. Mixt OS remembers the answer, so the user is asked only once.

## Ask for a Folder

To use one of the user's folders, call
[`mixt.perms.request()`](/Perms/request/) with `'folder'`, the folder name and
the access you need. It resolves to the folder's path, which you then use with
the [filesystem API](/FS/):

```js
const path = await mixt.perms.request('folder', {
    name: 'Documents',
    access: 'write',
});

if (path) {
    await mixt.fs.write(`${path}/notes.txt`, 'Saved!');
}
```

The folder can be `Desktop`, `Documents`, `Pictures` or `Videos`. Access is
`'read'` by default. Write access includes read access, so one `'write'` request
covers both.

## Ask for Apps or Subdomains

To read the list of the user's apps, call
[`mixt.perms.request()`](/Perms/request/) with `'apps'`. It resolves to `true`
when granted, and then [`mixt.apps.list()`](/Apps/list/) returns the user's
apps:

```js
if (await mixt.perms.request('apps')) {
    const apps = await mixt.apps.list();
    console.log(apps.length);
}
```

To publish to the user's subdomains, ask for `'subdomains'` with write access:

```js
const canPublish = await mixt.perms.request('subdomains', { access: 'write' });
```

## Ask for the Email Address

To get the user's email address, call [`mixt.perms.request()`](/Perms/request/)
with `'email'`. It resolves to the address itself:

```js
const email = await mixt.perms.request('email');

if (email) {
    console.log(email);
}
```

When the user declines, [`mixt.perms.request()`](/Perms/request/) resolves to a
falsy value for every resource. That is why a single `if` handles both outcomes
in each example on this page.

## Check Before You Ask

To find out whether access is already granted, call
[`mixt.perms.check()`](/Perms/check/). It takes the same arguments as
[`mixt.perms.request()`](/Perms/request/), resolves to `true` or `false`, and
never shows a prompt. Use it when your own UI needs to show the current state,
such as a settings toggle for saving to Documents:

```js
const details = { name: 'Documents', access: 'write' };

toggle.checked = await mixt.perms.check('folder', details);

toggle.addEventListener('change', async () => {
    if (toggle.checked) {
        toggle.checked = Boolean(await mixt.perms.request('folder', details));
    }
});
```

When you only need the access itself, call
[`mixt.perms.request()`](/Perms/request/) directly. It skips the prompt for
anything the user has already granted.

## Notes

- When your app needs several resources, such as a folder and the email
  address, you can request all of them in one prompt.
  [Ask for Access to Multiple Resources](/recipes/ask-for-access-to-multiple-resources/)
  covers it.
