---
title: mixt.fs.read()
description: Read data from files in the user's own Mixt OS file system.
platforms: [websites, apps, nodejs, workers]
---

Reads data from a file.

## Syntax

```js
mixt.fs.read(path)
mixt.fs.read(path, options)
mixt.fs.read(options)
```

## Parameters

#### `path` (String) (required)

Path of the file to read, or its UID.
If `path` is not absolute, it will be resolved relative to the app's root directory. A relative name that looks like a UID is read as one; prefix it with `./` to address a file by that name.

#### `options` (Object) (optional)

An object with the following properties:

- `path` (String) - Path to the file to read. Required when passing options as the only argument.
- `offset` (Number) (optional)
The offset to start reading from.
- `byte_count` (Number) (required if `offset` is provided)
The number of bytes to read from the offset.

## Return value

A `Promise` that will resolve to a `Blob` object containing the contents of the file.

## Examples

<strong class="example-title">Read a file</strong>

```html;fs-read
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
        (async () => {
            // (1) Create a random text file
            let filename = mixt.randName() + ".txt";
            await mixt.fs.write(filename, "Hello world! I'm a file!");
            mixt.print(`"${filename}" created<br>`);

            // (2) Read the file and print its contents
            let blob = await mixt.fs.read(filename);
            let content = await blob.text();
            mixt.print(`"${filename}" read (content: "${content}")<br>`);
        })();
    </script>
</body>
</html>
```
