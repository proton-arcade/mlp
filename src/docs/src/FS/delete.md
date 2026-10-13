---
title: mixt.fs.delete()
description: Deletes a file or directory in the user's own Mixt OS file system.
platforms: [websites, apps, nodejs, workers]
---

Deletes a file or directory.

## Syntax

```js
mixt.fs.delete(paths)
mixt.fs.delete(paths, options)
mixt.fs.delete(options)
```

## Parameters

#### `paths` (String | String[]) (required)

A single path or array of paths of the file(s) or directory(ies) to delete. A UID can be given in place of a path.
If a path is not absolute, it will be resolved relative to the app's root directory. A relative name that looks like a UID is read as one; prefix it with `./` to address a file by that name.

#### `options` (Object) (optional)

The options for the `delete` operation. The following options are supported:

- `paths` (String | String[]) - A single path or array of paths to delete. Required when passing options as the only argument.
- `recursive` (Boolean) - Whether to delete the directory recursively. Defaults to `true`.
- `descendantsOnly` (Boolean) - Whether to delete only the descendants of the directory and not the directory itself. Defaults to `false`.

## Return value

A `Promise` that will resolve when the file or directory is deleted.

Deleting an item withdraws every [share](/FS/share/) on it and on everything
inside it, links and unclaimed invites included. Moving an item to Trash counts
as deleting it here, and restoring it does not bring the shares back.

## Examples

<strong class="example-title">Delete a file</strong>

```html;fs-delete
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random file
            let filename = mixt.randName();
            await mixt.fs.write(filename, 'Hello, world!');
            mixt.print('File created successfully<br>');

            // (2) Delete the file
            await mixt.fs.delete(filename);
            mixt.print('File deleted successfully');
        })();
    </script>
</body>
</html>
```

<strong class="example-title">Delete a directory</strong>

```html;fs-delete-directory
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random directory
            let dirname = mixt.randName();
            await mixt.fs.mkdir(dirname);
            mixt.print('Directory created successfully<br>');

            // (2) Delete the directory
            await mixt.fs.delete(dirname);
            mixt.print('Directory deleted successfully');
        })();
    </script>
</body>
</html>
```
