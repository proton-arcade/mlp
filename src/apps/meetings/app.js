/*
 * Meetings: small group video calls (up to 8 people per meeting code).
 *
 * The Mixt server relays signalling only (WebRTC offers, answers, ICE
 * candidates and chat messages) between sockets in the same meeting room.
 * Audio, video and screen share travel directly between browsers.
 * Each peer connects to every other peer (a full mesh), using the
 * "perfect negotiation" pattern so either side can renegotiate safely.
 */
(() => {
    'use strict';

    const MAX_PEERS = 8;
    const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    const $ = (id) => document.getElementById(id);
    const els = {
        lobby: $('lobby'), name: $('name'), room: $('room'), gen: $('gen'), join: $('join'), err: $('err'),
        call: $('call'), grid: $('grid'), roomLabel: $('roomLabel'), mic: $('mic'), cam: $('cam'),
        share: $('share'), chatToggle: $('chatToggle'), leave: $('leave'), side: $('side'),
        msgs: $('msgs'), sendForm: $('sendForm'), chatText: $('chatText'),
    };

    const state = {
        socket: null,
        room: '',
        myId: '',
        myName: '',
        local: null,        // MediaStream from the camera and microphone
        screen: null,       // MediaStream from screen share, when active
        peers: new Map(),   // socket id -> peer record
        tiles: new Map(),   // tile key -> element
    };

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function showError (msg) { els.err.textContent = msg || ''; }

    function randomCode () {
        const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
        const bytes = new Uint8Array(10);
        crypto.getRandomValues(bytes);
        let out = '';
        for (const b of bytes) out += alphabet[b % alphabet.length];
        return out.slice(0, 3) + '-' + out.slice(3, 7) + '-' + out.slice(7);
    }

    function normaliseCode (raw) {
        return String(raw || '').trim().toLowerCase().replace(/\s+/g, '-');
    }

    /* ---------- Connection to the Mixt server ---------- */

    function serverOrigin () {
        // The realtime socket is served by the GUI origin, the same host that
        // serves this page, so the page's own origin is the right target.
        return window.gui_origin || location.origin;
    }

    function authToken () {
        return (window.mixt && mixt.authToken) || localStorage.getItem('auth_token_v2') || '';
    }

    function connect () {
        if (state.socket) return Promise.resolve(state.socket);
        return new Promise((resolve, reject) => {
            const socket = window.io(serverOrigin() + '/', {
                auth: { auth_token: authToken() },
                transports: ['websocket', 'polling'],
                withCredentials: true,
                reconnection: false,
            });
            const timer = setTimeout(() => { socket.close(); reject(new Error('Could not reach the Mixt server.')); }, 15000);
            socket.on('connect', () => { clearTimeout(timer); state.socket = socket; resolve(socket); });
            socket.on('connect_error', (e) => { clearTimeout(timer); socket.close(); reject(new Error('Sign in to Mixt to use Meetings. ' + (e && e.message ? e.message : ''))); });
            socket.on('meeting.peer-joined', onPeerJoined);
            socket.on('meeting.peer-left', ({ id }) => removePeer(id));
            socket.on('meeting.signal', onSignal);
            socket.on('disconnect', () => { if (state.room) endCall('Connection to the server was lost.'); });
        });
    }

    function emitJoin (socket, room, name) {
        return new Promise((resolve) => {
            socket.emit('meeting.join', { room, name }, resolve);
        });
    }

    /* ---------- Media ---------- */

    async function openMedia () {
        const attempts = [
            { audio: true, video: { width: { ideal: 960 }, height: { ideal: 540 } } },
            { audio: true, video: false },
            { audio: false, video: true },
        ];
        for (const constraints of attempts) {
            try {
                return await navigator.mediaDevices.getUserMedia(constraints);
            } catch (_) { /* try the next option */ }
        }
        return new MediaStream();   // join listen-only, with no devices
    }

    function ensureTransceivers (pc) {
        // Peers that have no camera or microphone still receive media.
        const kinds = pc.getTransceivers().map((t) => t.receiver.track.kind);
        for (const kind of ['audio', 'video']) {
            if (!kinds.includes(kind)) pc.addTransceiver(kind, { direction: 'recvonly' });
        }
    }

    /* ---------- Peer connections (full mesh) ---------- */

    function createPeer (id, name) {
        if (state.peers.has(id)) return state.peers.get(id);
        const pc = new RTCPeerConnection(ICE);
        const peer = {
            id, name, pc,
            polite: state.myId < id,   // the peer with the larger id yields on collisions
            makingOffer: false,
            ignoreOffer: false,
            pendingCandidates: [],
            screenSenders: [],
            screenStreamIds: new Set(),
        };
        state.peers.set(id, peer);

        if (state.local) {
            for (const track of state.local.getTracks()) pc.addTrack(track, state.local);
        }
        ensureTransceivers(pc);

        pc.onicecandidate = (e) => {
            if (e.candidate) sendTo(id, { type: 'candidate', candidate: e.candidate });
        };
        pc.onnegotiationneeded = async () => {
            try {
                peer.makingOffer = true;
                await pc.setLocalDescription();
                sendTo(id, { type: 'description', description: pc.localDescription });
            } catch (err) {
                console.warn('negotiation failed', err);
            } finally {
                peer.makingOffer = false;
            }
        };
        pc.ontrack = ({ streams, track }) => {
            const stream = streams[0] || new MediaStream([track]);
            addRemoteTile(peer, stream);
        };
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
                pc.restartIce();
            }
        };
        return peer;
    }

    async function onSignal ({ from, data }) {
        if (!data) return;
        let peer = state.peers.get(from);
        if (!peer) {
            if (data.type !== 'description') return;
            peer = createPeer(from, 'Guest');
        }
        if (data.type === 'chat') {
            addChat(peer.name, data.text, false);
            return;
        }
        if (data.type === 'screen') {
            // The peer announces which of its streams is a screen share.
            peer.screenStreamIds.add(data.streamId);
            const tile = state.tiles.get(from + ':' + data.streamId);
            if (tile) tile.classList.add('screen');
            return;
        }
        const pc = peer.pc;
        try {
            if (data.type === 'description') {
                const desc = data.description;
                const collision = desc.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
                peer.ignoreOffer = !peer.polite && collision;
                if (peer.ignoreOffer) return;
                await pc.setRemoteDescription(desc);
                for (const c of peer.pendingCandidates.splice(0)) await pc.addIceCandidate(c).catch(() => {});
                if (desc.type === 'offer') {
                    await pc.setLocalDescription();
                    sendTo(from, { type: 'description', description: pc.localDescription });
                }
            } else if (data.type === 'candidate') {
                if (!pc.remoteDescription) { peer.pendingCandidates.push(data.candidate); return; }
                try {
                    await pc.addIceCandidate(data.candidate);
                } catch (err) {
                    if (!peer.ignoreOffer) throw err;
                }
            }
        } catch (err) {
            console.warn('signal failed', err);
        }
    }

    function sendTo (id, data) {
        if (state.socket) state.socket.emit('meeting.signal', { to: id, data });
    }

    function onPeerJoined ({ id, name }) {
        if (state.peers.size >= MAX_PEERS - 1) return;
        const peer = createPeer(id, name || 'Guest');
        peer.name = name || 'Guest';
        addSystem(`${peer.name} joined`);
    }

    function removePeer (id) {
        const peer = state.peers.get(id);
        if (!peer) return;
        peer.pc.close();
        state.peers.delete(id);
        for (const [key, el] of state.tiles) {
            if (key.startsWith(id + ':')) { el.remove(); state.tiles.delete(key); }
        }
        addSystem(`${peer.name} left`);
        updateLayout();
    }

    /* ---------- Tiles ---------- */

    function makeTile (key, label, { muted = false, screen = false } = {}) {
        const tile = document.createElement('div');
        tile.className = 'tile' + (screen ? ' screen' : '');
        tile.dataset.key = key;
        tile.innerHTML = `<video autoplay playsinline ${muted ? 'muted' : ''}></video>` +
            `<div class="avatar">${esc((label || '?').trim().charAt(0).toUpperCase())}</div>` +
            `<div class="label">${esc(label)}</div>`;
        els.grid.appendChild(tile);
        state.tiles.set(key, tile);
        updateLayout();
        return tile;
    }

    function attachStream (tile, stream) {
        const video = tile.querySelector('video');
        video.srcObject = stream;
        const refresh = () => {
            const hasVideo = stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);
            tile.classList.toggle('novideo', !hasVideo);
        };
        refresh();
        stream.onaddtrack = refresh;
        stream.onremovetrack = () => {
            refresh();
            if (stream.getTracks().length === 0) {
                tile.remove();
                state.tiles.delete(tile.dataset.key);
                updateLayout();
            }
        };
        for (const t of stream.getTracks()) {
            t.onmute = refresh;
            t.onunmute = refresh;
        }
        video.play().catch(() => {});
    }

    function addRemoteTile (peer, stream) {
        const key = peer.id + ':' + stream.id;
        if (state.tiles.has(key)) return;
        const isScreen = peer.screenStreamIds.has(stream.id);
        const tile = makeTile(key, isScreen ? `${peer.name} (screen)` : peer.name, { screen: isScreen });
        attachStream(tile, stream);
    }

    function addLocalTiles () {
        const tile = makeTile('local', (state.myName || 'You') + ' (you)', { muted: true });
        attachStream(tile, state.local);
    }

    function updateLayout () {
        const n = state.tiles.size;
        const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
        els.grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    }

    /* ---------- Controls ---------- */

    function syncButtons () {
        const audio = state.local && state.local.getAudioTracks()[0];
        const video = state.local && state.local.getVideoTracks()[0];
        els.mic.disabled = !audio;
        els.mic.textContent = audio && audio.enabled ? 'Mute' : 'Unmute';
        els.mic.classList.toggle('on', !!audio && !audio.enabled);
        els.cam.disabled = !video;
        els.cam.textContent = video && video.enabled ? 'Camera off' : 'Camera on';
        els.cam.classList.toggle('on', !!video && !video.enabled);
        els.share.textContent = state.screen ? 'Stop sharing' : 'Share screen';
        els.share.classList.toggle('on', !!state.screen);
    }

    els.mic.addEventListener('click', () => {
        const t = state.local && state.local.getAudioTracks()[0];
        if (t) t.enabled = !t.enabled;
        syncButtons();
    });

    els.cam.addEventListener('click', () => {
        const t = state.local && state.local.getVideoTracks()[0];
        if (t) t.enabled = !t.enabled;
        syncButtons();
        const own = state.tiles.get('local');
        if (own) own.classList.toggle('novideo', !(t && t.enabled));
    });

    els.share.addEventListener('click', async () => {
        if (state.screen) { stopScreen(); return; }
        if (!navigator.mediaDevices.getDisplayMedia) { addSystem('Screen sharing is not available in this browser.'); return; }
        try {
            const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            state.screen = screen;
            for (const peer of state.peers.values()) {
                peer.screenSenders = screen.getTracks().map((track) => peer.pc.addTrack(track, screen));
            }
            const [track] = screen.getVideoTracks();
            track.onended = () => stopScreen();
            for (const id of state.peers.keys()) sendTo(id, { type: 'screen', streamId: screen.id });
            const tile = makeTile('local-screen', `${state.myName || 'You'} (screen)`, { muted: true, screen: true });
            attachStream(tile, screen);
            syncButtons();
        } catch (err) {
            addSystem('Screen share was cancelled.');
        }
    });

    function stopScreen () {
        if (!state.screen) return;
        for (const peer of state.peers.values()) {
            for (const sender of peer.screenSenders) {
                try { peer.pc.removeTrack(sender); } catch (_) {}
            }
            peer.screenSenders = [];
        }
        for (const t of state.screen.getTracks()) t.stop();
        state.screen = null;
        for (const id of state.peers.keys()) sendTo(id, { type: 'screen', streamId: null });
        const tile = state.tiles.get('local-screen');
        if (tile) { tile.remove(); state.tiles.delete('local-screen'); }
        updateLayout();
        syncButtons();
    }

    els.chatToggle.addEventListener('click', () => {
        els.side.classList.toggle('show');
        if (els.side.classList.contains('show')) els.chatText.focus();
    });

    els.sendForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = els.chatText.value.trim();
        if (!text) return;
        els.chatText.value = '';
        for (const id of state.peers.keys()) sendTo(id, { type: 'chat', text });
        addChat(state.myName || 'You', text, true);
    });

    function addChat (who, text, mine) {
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<b>${esc(mine ? 'You' : who)}</b><p>${esc(text)}</p>`;
        els.msgs.appendChild(div);
        els.msgs.scrollTop = els.msgs.scrollHeight;
        if (!mine && !els.side.classList.contains('show')) els.chatToggle.classList.add('on');
    }

    function addSystem (text) {
        const div = document.createElement('div');
        div.className = 'msg sys';
        div.textContent = text;
        els.msgs.appendChild(div);
        els.msgs.scrollTop = els.msgs.scrollHeight;
    }

    els.leave.addEventListener('click', () => endCall(''));

    /* ---------- Joining and leaving ---------- */

    async function join () {
        showError('');
        const room = normaliseCode(els.room.value);
        if (!/^[a-z0-9-]{8,64}$/.test(room)) {
            showError('Enter a meeting code of 8 to 64 letters, digits or hyphens. Use New code to make one.');
            return;
        }
        const name = els.name.value.trim().slice(0, 40) || 'Guest';
        els.join.disabled = true;
        try {
            const socket = await connect();
            state.local = await openMedia();
            const ack = await emitJoin(socket, room, name);
            if (!ack || !ack.ok) {
                state.local.getTracks().forEach((t) => t.stop());
                state.local = null;
                const messages = {
                    bad_room: 'That meeting code is not valid.',
                    full: `This meeting already has ${MAX_PEERS} people.`,
                    rate_limited: 'Too many attempts. Wait a minute and try again.',
                };
                showError(messages[ack && ack.error] || 'Could not join the meeting.');
                return;
            }
            state.room = room;
            state.myName = name;
            state.myId = socket.id;
            localStorage.setItem('meetings.name', name);
            els.lobby.style.display = 'none';
            els.call.classList.add('show');
            els.roomLabel.textContent = 'Meeting code: ' + room;
            addLocalTiles();
            for (const p of ack.peers) {
                const peer = createPeer(p.id, p.name || 'Guest');
                peer.name = p.name || 'Guest';
            }
            addSystem('You joined. Share the meeting code with others to invite them.');
            syncButtons();
        } catch (err) {
            showError(err.message || 'Could not join the meeting.');
            if (state.local) { state.local.getTracks().forEach((t) => t.stop()); state.local = null; }
        } finally {
            els.join.disabled = false;
        }
    }

    function endCall (reason) {
        if (state.socket && state.room) state.socket.emit('meeting.leave');
        for (const peer of state.peers.values()) peer.pc.close();
        state.peers.clear();
        stopScreen();
        if (state.local) { state.local.getTracks().forEach((t) => t.stop()); state.local = null; }
        for (const el of state.tiles.values()) el.remove();
        state.tiles.clear();
        state.room = '';
        state.myId = '';
        els.msgs.innerHTML = '';
        els.side.classList.remove('show');
        els.chatToggle.classList.remove('on');
        els.call.classList.remove('show');
        els.lobby.style.display = '';
        if (reason) showError(reason);
        if (state.socket && !state.socket.connected) state.socket = null;
    }

    els.join.addEventListener('click', join);
    els.gen.addEventListener('click', () => { els.room.value = randomCode(); showError(''); });
    els.room.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
    window.addEventListener('beforeunload', () => {
        if (state.socket && state.room) state.socket.emit('meeting.leave');
    });

    // Prefill from the URL (?room=...) and the last used name.
    const params = new URLSearchParams(location.search);
    els.name.value = params.get('name') || localStorage.getItem('meetings.name') || '';
    if (params.get('room')) els.room.value = normaliseCode(params.get('room'));
    else els.room.value = randomCode();
})();
