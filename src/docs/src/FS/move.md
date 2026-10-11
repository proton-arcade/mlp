---
title: mixt.fs.move()
description: Move files or directories to new locations in the user's own Mixt OS file system.
platforms: [websites, apps, nodejs, workers]
---

Moves a file or a directory from one location to another.

## Syntax

```js
mixt.fs.move(source, destination)
mixt.fs.move(source, destination, options)
mixt.fs.move(options)
```

## Parameters

#### `source` (String) (Required)

The path or UID of the file or directory to move.

#### `destination` (String) (Required)

The path to the destination directory, or the item's new path. If destination is a directory then the file or directory will be moved into that directory using the same name as the source file or directory. Otherwise the item is moved into the destination's parent directory under its last path component; if a file is already there, we overwrite if overwrite is `true`, otherwise we error. A UID can be given in place of a path, and must name a directory.

Relative paths resolve against the app's root directory. A relative name that looks like a UID is read as one; prefix it with `./` to address a file by that name.

Without `newName`, the destination is looked up first to tell the two cases apart. If that lookup fails for any reason other than the destination not existing (for example, access is denied), the promise rejects with that error.

#### `options` (Object) (Optional)

The options for the `move` operation. The following options are supported:

- `source` (String) - Path to the file or directory to move. Required when passing options as the only argument.
- `destination` (String) - Path to the destination. Required when passing options as the only argument.
- `overwrite` (Boolean) - Whether to overwrite the destination file or directory if it already exists. Defaults to `false`.
- `dedupeName` (Boolean) - Whether to deduplicate the file or directory name if it already exists. Defaults to `false`.
- `newName` (String) - The name to give the moved file or directory. When set, `destination` is always treated as the directory to move into. Defaults to the source's own name.
- `createMissingParents` (Boolean) - Whether to create missing parent directories. Defaults to `false`.

## Return value

A `Promise` that will resolve to the [`FSItem`](/Objects/fsitem) object of the moved file or directory. If the source file or directory does not exist, the promise will be rejected with an error.

## Examples

<strong class="example-title">Move a file</strong>

```html;fs-move
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
    (async () => {
        // (1) Create a random text file
        let filename = mixt.randName() + '.txt';
        await mixt.fs.write(filename, 'Hello, world!');
        mixt.print(`Created file: ${filename}<br>`);

        // (2) create a random directory
        let dirname = mixt.randName();
        await mixt.fs.mkdir(dirname);
        mixt.print(`Created directory: ${dirname}<br>`);

        // (3) Move the file into the directory
        await mixt.fs.move(filename, dirname);
        mixt.print(`Moved file: ${filename} to directory ${dirname}<br>`);

        // (4) Delete the file and directory (cleanup)
        await mixt.fs.delete(dirname + '/' + filename);
        await mixt.fs.delete(dirname);
    })();
    </script>
</body>
</html>
```

<strong class="example-title">Move a file and create missing parent directories</strong>

```html;fs-move-create-missing-parents
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
    (async () => {
        // (1) Create a random file
        let filename = mixt.randName() + '.txt';
        await mixt.fs.write(filename, 'Hello, world!');
        mixt.print('Created file: ' + filename + '<br>');

        // (2) Move the file into a non-existent directory
        let dirname = mixt.randName();
        await mixt.fs.move(filename, dirname + '/' + filename, { createMissingParents: true });
        mixt.print(`Moved ${filename} to ${dirname}<br>`);

        // (3) Delete the file and directory (cleanup)
        await mixt.fs.delete('non-existent-directory/' + filename);
        await mixt.fs.delete('non-existent-directory');
    })();
    </script>
</body>
</html>
```
