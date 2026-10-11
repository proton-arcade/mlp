---
title: Networking
description: Establish network connections directly from the frontend without a server or proxy.
---

The Mixt.js Networking API lets you establish network connections directly from your frontend without requiring a server or a proxy, effectively giving you a full-featured networking API in the browser.

`mixt.net` provides both low-level socket connections via TCP socket and TLS socket, and high-level HTTP client functionality, such as `fetch`. One of the major benefits of `mixt.net` is that it allows you to bypass CORS restrictions entirely, making it a powerful tool for developing web applications that need to make requests to external APIs.

## Features

<div style="overflow:hidden; margin-bottom: 30px;">
    <div class="example-group active" data-section="fetch"><span>Fetch</span></div>
    <div class="example-group" data-section="socket"><span>Socket</span></div>
    <div class="example-group" data-section="tlssocket"><span>TLS Socket</span></div>
</div>

<div class="example-content" data-section="fetch" style="display:block;">

#### Fetch a resource without CORS restrictions

```html;net-fetch
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
    (async () => {
        // Send a GET request to example.com
        const request = await mixt.net.fetch("https://example.com");

        // Get the response body as text
        const body = await request.text();

        // Print the body as a code block
        mixt.print(body, { code: true });
    })()
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="socket">

#### Connect to a server and print the response

```html;net-basic
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
    const socket = new mixt.net.Socket("example.com", 80);
    socket.on("open", () => {
        socket.write("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
    })
    const decoder = new TextDecoder();
    socket.on("data", (data) => {
        mixt.print(decoder.decode(data), { code: true });
    })
    socket.on("error", (reason) => {
        mixt.print("Socket errored with the following reason: ", reason);
    })
    socket.on("close", (hadError)=> {
        mixt.print("Socket closed. Was there an error? ", hadError);
    })
    </script>
</body>
</html>
```

</div>

<div class="example-content" data-section="tlssocket">

#### Connect to a server with TLS and print the response

```html;net-tls
<html>
<body>
    <script src="/mixt.js/v2"></script>
    <script>
    const socket = new mixt.net.tls.TLSSocket("example.com", 443);
    socket.on("tlsopen", () => {
        socket.write("GET / HTTP/1.1\r\nHost: example.com\r\n\r\n");
    })
    const decoder = new TextDecoder();
    socket.on("tlsdata", (data) => {
        mixt.print(decoder.decode(data), { code: true });
    })
    socket.on("error", (reason) => {
        mixt.print("Socket errored with the following reason: ", reason);
    })
    socket.on("tlsclose", (hadError)=> {
        mixt.print("Socket closed. Was there an error? ", hadError);
    })
    </script>
</body>
</html>
```

</div>

## Functions

These networking features are supported out of the box when using Mixt.js:

- **[`mixt.net.fetch()`](/Networking/fetch/)** - Make HTTP requests
- **[`mixt.net.Socket()`](/Networking/Socket/)** - Create TCP socket connections
- **[`mixt.net.tls.TLSSocket()`](/Networking/TLSSocket/)** - Create secure TLS socket connections

## Examples

You can see various Mixt.js networking features in action from the following examples:

- [Basic TCP Socket](/playground/net-basic/)
- [TLS Socket](/playground/net-tls/)
- [Fetch](/playground/net-fetch/)

## Tutorials

- [How to Bypass CORS Restrictions](https://developer.mixt.mpl/tutorials/cors-free-fetch-api/)
