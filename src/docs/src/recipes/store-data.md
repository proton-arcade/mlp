---
title: Store Data
description: "Learn how to store data in the Mixt.js key-value database. Every entry lives inside the user's own Mixt OS account."
tags: [kv, auth, data-modeling]
order: 5
---

The foundation of every application is storing data, and in Mixt.js you do that
with the [key-value store API](/KV/). It supports the standard operations you
would expect from any database, such as writes, reads, updates, deletes, and
more. All data lives inside the user's own Mixt OS account.

## Set

To store data, use the [`mixt.kv.set()`](/KV/set/) method. It takes a key and a
value:

```js
await mixt.kv.set('theme', 'dark');
```

A value can be a string, a number, a boolean, or a whole object or array, so a
structured record goes in the same way a single setting does:

```js
await mixt.kv.set('settings', { theme: 'dark', sound: false, volume: 0.8 });
await mixt.kv.set('recent', ['mixt.js', 'kv', 'workers']);
```

Setting the same key again replaces its value:

```js
await mixt.kv.set('theme', 'dark');
await mixt.kv.set('theme', 'light');   // 'theme' is now 'light'
```

## Get

To read it back, use the [`mixt.kv.get()`](/KV/get/) method. It takes a key and
returns the value in the shape you stored it:

```js
const settings = await mixt.kv.get('settings');
settings.theme;      // 'dark'
```

A key that was never written comes back empty, which is where your defaults go:

```js
const settings = await mixt.kv.get('settings') ?? { theme: 'light', sound: true };
```

For most apps that is the whole storage layer. You call
[`mixt.kv.set()`](/KV/set/) when something changes and
[`mixt.kv.get()`](/KV/get/) when the app loads.

## Where the Data Lives

Each entry is written to the **signed-in user's own account**, inside a sandbox
that belongs to your app. User A's `settings` and user B's `settings` are
separate entries, and neither user can read the other's. Every other app in the
same account gets its own sandbox, so your keys and another app's keys never
mix. The user covers their own storage under the [User-Pays
Model](/user-pays-model/).

## List

To see what you stored, use the [`mixt.kv.list()`](/KV/list/) method. It
returns the keys your app wrote for this user, sorted by key:

```js
const keys = await mixt.kv.list();
// ['recent', 'settings', 'theme']
```

Pass `true` to get the values along with them:

```js
const entries = await mixt.kv.list(true);
// [{ key: 'recent', value: ['mixt.js', 'kv', 'workers'] }, ...]
```

## Delete

To remove one entry, use the [`mixt.kv.del()`](/KV/del/) method:

```js
await mixt.kv.del('theme');
```

## Flush

To empty your app's sandbox for this user, use the
[`mixt.kv.flush()`](/KV/flush/) method:

```js
await mixt.kv.flush();
```

## Notes

- Binary data, such as an image, an audio clip or a PDF, goes to the user's
  drive with the [filesystem API](/FS/) instead. [Store files in the user's own
  Mixt OS account](/recipes/store-files/) covers it.
- Data every user has to see, such as a leaderboard or a guestbook, goes [behind
  a worker](/recipes/store-server-side-data/), which runs under your account
  instead of theirs.
