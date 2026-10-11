---
title: mixt.fs.mkdir()
description: Create directories in the user's own Mixt OS file system.
platforms: [websites, apps, nodejs, workers]
---

Allows you to create a directory.

## Syntax

```js
mixt.fs.mkdir(path)
mixt.fs.mkdir(path, options)
mixt.fs.mkdir(options)
```

## Parameters

#### `path` (String) (required)

The path to the directory to create.
If path is not absolute, it will be resolved relative to the app's root directory.

#### `options` (Object)

The options for the `mkdir` operation. The following options are supported:

- `path` (String) The directory path to be created if not specified via function parameter.
- `overwrite` (Boolean) - Whether to overwrite the directory if it already exists. Defaults to `false`.
- `dedupeName` (Boolean) - Whether to deduplicate the directory name if it already exists. Defaults to `false`.
- `createMissingParents` (Boolean) - Whether to create missing parent directories. Defaults to `false`.

## Return value

Returns a `Promise` that resolves to the [`FSItem`](/Objects/fsitem) object of the created directory.

## Examples

<strong class="example-title">Create a new directory</strong>

```html;fs-mkdir
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        // Create a directory with random name
        let dirName = mixt.randName();
        mixt.fs.mkdir(dirName).then((directory) => {
            mixt.print(`"${dirName}" created at ${directory.path}`);
        }).catch((error) => {
            mixt.print('Error creating directory:', error);
        });
    </script>
</body>
</html>
```

<strong class="example-title">Create a directory with duplicate name handling</strong>

```html;fs-mkdir-dedupe
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // create a directory named 'hello'
            let dir_1 = await mixt.fs.mkdir('hello');
            mixt.print(`Directory 1: ${dir_1.name}<br>`);
            // create a directory named 'hello' again, it should be automatically renamed to 'hello (n)' where n is the next available number
            let dir_2 = await mixt.fs.mkdir('hello', { dedupeName: true });
            mixt.print(`Directory 2: ${dir_2.name}<br>`);
        })();
    </script>
</body>
</html>
```

<strong class="example-title">Create a new directory with missing parent directories</strong>

```html;fs-mkdir-create-missing-parents
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // Create a directory named 'hello' in a directory that does not exist
            let dir = await mixt.fs.mkdir('my-directory/another-directory/hello', { createMissingParents: true });
            mixt.print(`Directory created at: ${dir.path}<br>`);
        })();
    </script>
</body>
</html>
```
