---
title: MixtPeerServer
description: The MixtPeerServer object returned by mixt.peer.serve(), representing a peer server and its connected clients.
---

The `MixtPeerServer` object returned by [`mixt.peer.serve()`](/Peer/serve/). It holds the invite code other clients use to reach you, and tracks every client that connects.

`MixtPeerServer` extends [`EventTarget`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget), so events are subscribed to with `addEventListener()`.

## Attributes

#### `inviteCode` (String)

The code to share with other clients so they can connect with [`mixt.peer.connect()`](/Peer/connect/). It survives the signalling connection dropping and coming back; on the rare occasion it cannot, the `reconnect` event carries the new one.

#### `connections` (Map)

A `Map` of every connected client, keyed by connection id. The values are [`MixtPeerConnection`](/Objects/mixtpeerconnection/) objects.

## Methods

#### `close()`

Closes every client connection and the signalling connection, and gives the invite code up so it stops working at once.

## Events

#### `connection`

Fired when a client connects. The event has the following attributes:

- `conn` ([`MixtPeerConnection`](/Objects/mixtpeerconnection/)) - The connection to the client.
- `user` (Object) - Metadata about the connecting user, with `username` and `uuid` (if available).

#### `reconnect`

Fired when a dropped signalling connection has been re-established. A server dials the signaller again on its own, so a network blip, a laptop waking up or a signaller restart does not end the session — and existing client connections, being peer-to-peer, carry on throughout either way.

- `inviteCode` (String) - The code to share from now on.
- `resumed` (Boolean) - Whether the previous session was reclaimed. When `true` the invite code is unchanged and the clients already connected can still be renegotiated with, so there is nothing to do. When `false` the session was gone — clients connected under it can no longer be reached and will close — and `inviteCode` is a new code that has to be shared in its place.

## Example

```js
const server = await mixt.peer.serve();
mixt.print(`Invite code: ${server.inviteCode}`);

server.addEventListener('connection', (event) => {
    const conn = event.conn;
    conn.addEventListener('open', () => {
        conn.send('Hello from the server!');
    });
    conn.addEventListener('message', (msg) => {
        mixt.print('Client says:', msg.data);
    });
});
```
