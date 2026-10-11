---
title: mixt.fs.write()
description: Write data to files in the user's own Mixt OS file system.
platforms: [websites, apps, nodejs, workers]
---

Writes data to a specified file path. This method is useful for creating new files or modifying existing ones in the Mixt OS cloud storage.

## Syntax

```js
mixt.fs.write(path)
mixt.fs.write(path, data)
mixt.fs.write(path, data, options)
mixt.fs.write(file)
```

## Parameters

#### `path` (String) (required)

The path to the file to write to.
If path is not absolute, it will be resolved relative to the app's root directory.

#### `data` (String|File|Blob|ArrayBuffer|TypedArray) (optional)

The data to write to the file. If omitted, an empty file is created.

#### `options` (Object)

The options for the `write` operation. The following options are supported:

- `overwrite` (boolean) - Whether to overwrite the file if it already exists. Defaults to `true`.
- `dedupeName` (boolean) - Whether to deduplicate the file name if it already exists. Defaults to `false`.
- `createMissingParents` (boolean) - Whether to create missing parent directories. Defaults to `false`.

#### `file` (File)

An alternative to `path` and `data`. A `File` object to write directly, where the file path will be derived from the file's name.

## Return value

Returns a `Promise` that resolves to the [`FSItem`](/Objects/fsitem) object of the written file.

## Examples

<strong class="example-title">Create a new file containing "Hello, world!"</strong>

```html;fs-write
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        // Create a new file called "hello.txt" containing "Hello, world!"
        mixt.fs.write('hello.txt', 'Hello, world!').then(() => {
            mixt.print('File written successfully');
        })
    </script>
</body>
</html>
```

<strong class="example-title">Create a new file with input coming from a file input</strong>

```html;fs-write-from-input
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <input type="file" id="file-input">
    <script>
        // Example: Writing a file with input coming from a file input
        document.getElementById('file-input').addEventListener('change', (event) => {
            mixt.fs.write('hello.txt', event.target.files[0]).then(() => {
                mixt.print('File written successfully');
            }).catch((error) => {
                mixt.print('Error writing file:', error);
            });
        });
    </script>
</body>
</html>
```

<strong class="example-title">Create a file with duplicate name handling</strong>

```html;fs-write-dedupe
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        (async () => {
            // create a file named 'hello.txt'
            let file_1 = await mixt.fs.write('hello.txt', 'Hello, world!');
            mixt.print(`File 1: ${file_1.name}<br>`);
            // create a file named 'hello.txt' again, it should be automatically renamed to 'hello (n).txt' where n is the next available number
            let file_2 = await mixt.fs.write('hello.txt', 'Hello, world!', { dedupeName: true });
            mixt.print(`File 2: ${file_2.name}<br>`);
        })();
    </script>
</body>
</html>
```

<strong class="example-title">Create a new file with missing parent directories</strong>

```html;fs-write-create-missing-parents
<html>
<body>
    <script src="https://js.mixt.mpl/v2/"></script>
    <script>
        (async () => {
            // create a file named 'hello.txt' in a directory that does not exist
            let file = await mixt.fs.write('my-directory/another-directory/hello.txt', 'Hello, world!', { createMissingParents: true });
            mixt.print(`File created at: ${file.path}<br>`);
        })();
    </script>
</body>
</html>
```
