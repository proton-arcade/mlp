---
title: Store Files
description: "Learn how to store binary files in Mixt.js object storage. Every file lives inside the user's own Mixt OS account."
tags: [fs, auth]
order: 7
---

Most applications need somewhere to keep binary files, such as images, videos,
PDFs, or exports the app generates. In Mixt.js that object storage is the
[filesystem API](/FS/). It supports the standard operations you would expect
from any filesystem, such as writes, reads, listings, deletes, and more. Files
are addressed by path rather than by bucket and key, and they all live inside
the user's own Mixt OS account.

## Write

To save a file, use the [`mixt.fs.write()`](/FS/write/) method. It takes a path
and the contents:

```js
await mixt.fs.write('notes/todo.txt', 'Buy milk');
```

The contents can be a `String`, `File`, `Blob`, `ArrayBuffer` or typed array, so
text and binary data are written the same way. Writing to a path that already
exists replaces the file. Passing `dedupeName` keeps both copies by saving the
new one under a free name, and passing `overwrite: false` rejects the write
instead:

```js
// Saves photo-1.png if photo.png is taken.
await mixt.fs.write('uploads/photo.png', blob, { dedupeName: true });

// Rejects if photo.png is taken.
await mixt.fs.write('uploads/photo.png', blob, { overwrite: false });
```

Use `dedupeName` when two users might upload a file with the same name and both
files should be kept.

Writing into a directory that does not exist yet is one more option:

```js
await mixt.fs.write('exports/2026/report.csv', csv, { createMissingParents: true });
```

## Read

To read a file back, use the [`mixt.fs.read()`](/FS/read/) method. It hands
back a `Blob`:

```js
const blob = await mixt.fs.read('notes/todo.txt');
await blob.text();      // 'Buy milk'
```

A `Blob` is what the browser already works with, so `.text()`, `.arrayBuffer()`
and `URL.createObjectURL()` all work on the result.

## Where the Files Live

Each file is written to the **signed-in user's own drive**. User A's
`notes/todo.txt` and user B's are separate files, neither user can read the
other's, and the user covers their own storage under the [User-Pays
Model](/user-pays-model/).

A relative path resolves against `~/AppData/<your-app-id>/`, the sandbox Mixt OS
creates for your app the first time the user signs in. You can create any files
and folders you like inside it, and your app cannot see anything outside it.

## Create a Folder

To create a directory, use the [`mixt.fs.mkdir()`](/FS/mkdir/) method. With
`createMissingParents`, it creates a whole tree in one call:

```js
await mixt.fs.mkdir('reports/2026/q3', { createMissingParents: true });
```

The [`mkdir()`](/FS/mkdir/) method takes the same `dedupeName` and `overwrite`
options as [`write()`](/FS/write/). The difference is the default. Creating a
directory that already exists fails unless you pass `overwrite: true`, while a
write replaces an existing file.

## Upload

To take a file from an `<input type="file">`, use the
[`mixt.fs.upload()`](/FS/upload/) method:

```js
input.onchange = async () => {
    const file = await mixt.fs.upload(input.files, 'uploads', { createMissingParents: true });
    file.path;      // '/user/AppData/app-.../uploads/photo.png'
};
```

One selected file resolves to one [`FSItem`](/Objects/fsitem/) and several
resolve to an array of them. A name that is already taken stays as it is, and
the new file lands under a free one.

## List

To see what a directory holds, use the [`mixt.fs.readdir()`](/FS/readdir/)
method:

```js
const items = await mixt.fs.readdir('uploads', { sortBy: 'modified', sortOrder: 'desc' });
// [ { name: 'photo.png', path: '/user/AppData/app-.../uploads/photo.png', size, modified, isDir }, ... ]
```

It pages the way a key listing does, with `limit` and `cursor`, or `stream:
true` for `for await`. [Work with a large
directory](/recipes/work-with-a-large-directory/) covers paging, sorting and
counting a directory of thousands of files.

To read the metadata of one file, use the [`mixt.fs.stat()`](/FS/stat/) method:

```js
const info = await mixt.fs.stat('uploads/photo.png');      // size, timestamps, id
```

## Rename, Move and Copy

To reorganize what is there, use the [`mixt.fs.rename()`](/FS/rename/),
[`mixt.fs.move()`](/FS/move/) and [`mixt.fs.copy()`](/FS/copy/) methods:

```js
await mixt.fs.rename('uploads/photo.png', 'cover.png');    // second argument is a name
await mixt.fs.move('uploads/draft.png', 'archive');        // second argument is a directory
await mixt.fs.copy('uploads/cover.png', 'archive');
```

## Delete

To remove a file, use the [`mixt.fs.delete()`](/FS/delete/) method:

```js
await mixt.fs.delete('uploads/old.png');
```

It also takes an array of paths to remove several items in one call, and
deleting a directory is recursive by default.

## Get a Link

To show a file in an `<img>` tag or hand it to a download button, use the
[`mixt.fs.getReadURL()`](/FS/getReadURL/) method. It mints a temporary URL for
one file:

```js
const url = await mixt.fs.getReadURL('uploads/photo.png', '1h');
```

The URL gives temporary access to that one file. It expires after the duration
you pass, or in 24 hours if you leave the duration off.

## Notes

- Structured data, such as settings, records and lists, belongs in the
  [key-value database](/KV/) instead. A JSON file means reading and rewriting
  the whole thing on every change, while a key-value entry addresses one record
  at a time. [Store data in the Mixt.js key-value
  database](/recipes/store-data/) covers it.
- Files every user of the app has to reach go [behind a
  worker](/recipes/store-server-side-data/), which runs under your account
  instead of theirs.
- A URL that stays valid takes hosting a directory instead of minting a link per
  file. [Host a file online](/recipes/host-file/) covers it.
