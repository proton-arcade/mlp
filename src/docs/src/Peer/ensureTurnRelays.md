---
title: mixt.peer.ensureTurnRelays()
description: Preload TURN relays for faster peer connections.
platforms: [websites, apps]
---


Fetches TURN relay credentials ahead of time so that peer connections can start faster. This is optional because `mixt.peer.serve()` and `mixt.peer.connect()` call it automatically when needed.

## Syntax

```js
await mixt.peer.ensureTurnRelays();
await mixt.peer.ensureTurnRelays(options);
```

## Parameters

#### `options` (optional)

`options` is an object with the following properties:

- `turnGrant` (`String`) A grant from [`mixt.peer.createGuestGrant()`](/Peer/createGuestGrant/), to preload relays as a guest with no Mixt OS session. Credentials are minted against the account that issued the grant.

## Return value

A `Promise` that resolves when relay details are cached. If relays cannot be loaded, Mixt.js will fall back to default ICE servers when connecting.
