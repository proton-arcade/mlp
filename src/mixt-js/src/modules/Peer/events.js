/** @typedef {import('./MixtPeerConnection.js').MixtPeerConnection} MixtPeerConnection */
/** @typedef {import('./types.js').MixtPeerUser} MixtPeerUser */

/**
 * How the link to a peer is doing: 'unstable' is a wobble nothing is being
 * done about yet, 'recovering' is the link actually being restored.
 *
 * @typedef {'connecting' | 'connected' | 'unstable' | 'recovering' | 'closed'} MixtPeerLinkState
 */

/** A client joined a peer server. */
export class MixtPeerServerConnectionEvent extends Event {
    /** @type {MixtPeerConnection} */
    conn;
    /** @type {MixtPeerUser} */
    user;
    /**
     * @param {MixtPeerConnection} connection
     * @param {MixtPeerUser} user
     */
    constructor (connection, user) {
        super('connection');
        this.conn = connection;
        this.user = user;
    }
}

/**
 * The signaller socket came back. `resumed` says whether the session came
 * with it: when it did, the invite code is the same one and the clients
 * already connected can be renegotiated with again.
 */
export class MixtPeerServerReconnectEvent extends Event {
    /** @type {string | undefined} */
    inviteCode;
    /** @type {boolean} */
    resumed;
    /**
     * Why a reclaim was refused, when one was asked for and turned down.
     * @type {string | undefined}
     */
    refused;
    /**
     * @param {string | undefined} inviteCode
     * @param {boolean} resumed
     * @param {string} [refused]
     */
    constructor (inviteCode, resumed, refused) {
        super('reconnect');
        this.inviteCode = inviteCode;
        this.resumed = resumed;
        this.refused = refused;
    }
}

/** A message arrived over the data channel. */
export class MixtPeerConnectionMessageEvent extends Event {
    /** @type {string | ArrayBuffer | Blob} */
    data;
    /** @param {string | ArrayBuffer | Blob} message */
    constructor (message) {
        super('message');
        this.data = message;
    }
}

/** The data channel is open. */
export class MixtPeerConnectionOpenEvent extends Event {
    constructor () {
        super('open');
    }
}

/** The connection closed. */
export class MixtPeerConnectionCloseEvent extends Event {
    /** @type {string | undefined} */
    reason;
    /** @param {string} [reason] */
    constructor (reason = undefined) {
        super('close');
        this.reason = reason;
    }
}

/** Something went wrong on the connection; it carries on unless a `close` follows. */
export class MixtPeerConnectionErrorEvent extends Event {
    /** @type {Error} */
    error;
    /** @param {Error} error */
    constructor (error) {
        super('error');
        this.error = error;
    }
}

/** A track arrived from the peer, under the name it was published with. */
export class MixtPeerMediaEvent extends Event {
    /** @type {string} */
    name;
    /** @type {MediaStream} */
    stream;
    /** @type {MediaStreamTrack} */
    track;
    /**
     * @param {string} name
     * @param {MediaStream} stream
     * @param {MediaStreamTrack} track
     */
    constructor (name, stream, track) {
        super('media');
        this.name = name;
        this.stream = stream;
        this.track = track;
    }
}

/** The peer stopped publishing a name. */
export class MixtPeerMediaEndedEvent extends Event {
    /** @type {string} */
    name;
    /** @type {MediaStream} */
    stream;
    /**
     * @param {string} name
     * @param {MediaStream} stream
     */
    constructor (name, stream) {
        super('mediaended');
        this.name = name;
        this.stream = stream;
    }
}

/** The link's state changed; `attempt` counts the attempts at restoring it. */
export class MixtPeerLinkStateEvent extends Event {
    /** @type {MixtPeerLinkState} */
    state;
    /** @type {number | undefined} */
    attempt;
    /**
     * @param {MixtPeerLinkState} state
     * @param {{ attempt?: number }} [detail]
     */
    constructor (state, { attempt } = {}) {
        super('linkstate');
        this.state = state;
        this.attempt = attempt;
    }
}

/**
 * The events a `MixtPeerConnection` fires, by name.
 *
 * @typedef {{
 *   open: MixtPeerConnectionOpenEvent,
 *   message: MixtPeerConnectionMessageEvent,
 *   close: MixtPeerConnectionCloseEvent,
 *   error: MixtPeerConnectionErrorEvent,
 *   media: MixtPeerMediaEvent,
 *   mediaended: MixtPeerMediaEndedEvent,
 *   linkstate: MixtPeerLinkStateEvent,
 * }} MixtPeerConnectionEventMap
 */

/**
 * The events a `MixtPeerServer` fires, by name.
 *
 * @typedef {{
 *   connection: MixtPeerServerConnectionEvent,
 *   reconnect: MixtPeerServerReconnectEvent,
 * }} MixtPeerServerEventMap
 */
