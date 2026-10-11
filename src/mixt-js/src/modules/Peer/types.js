/**
 * Options for `mixt.peer.serve()` and `mixt.peer.connect()`.
 *
 * @typedef {Object} MixtPeerOptions
 * @property {RTCIceServer[]} [iceServers] Custom ICE servers (STUN/TURN) to use instead of the
 * Mixt-managed relays.
 * @property {boolean} [forceRelay] Route every candidate through a TURN relay.
 * @property {string} [anonToken] Take part without a Mixt session. Any uuid; it identifies this
 * guest for the duration of the session and skips the sign-in prompt.
 * @property {string} [turnGrant] A grant from `mixt.peer.createGuestGrant()`, letting a guest with
 * no session use the Mixt-managed relays on the granting account's allowance.
 * @property {number} [port] Internal loopback port used by supported Mixt environments.
 * @property {number} [recoveryTimeout] How long, in milliseconds, a connection keeps trying to
 * rescue a broken link before closing, counted from when the link first showed trouble. Defaults
 * to 60000.
 */

/**
 * Metadata about a peer user.
 *
 * @typedef {Object} MixtPeerUser
 * @property {string} username
 * @property {string} uuid
 */

/** @typedef {string | Blob | ArrayBuffer | ArrayBufferView} MixtPeerMessage */
/** @typedef {RTCSessionDescription | RTCSessionDescriptionInit} MixtPeerDescription */
/** @typedef {RTCIceCandidate | RTCIceCandidateInit} MixtPeerIceCandidate */

export {};
