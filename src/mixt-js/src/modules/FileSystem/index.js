import path from 'path-browserify';
import { io } from 'socket.io-client';
import { MixtModule } from '../../lib/MixtModule.js';
import { socketAutoUnref } from '../../lib/socketOptions.js';
import * as utils from '../../lib/utils.js';

// Constants
//
// The last valid time of the local cache.
const LAST_VALID_TS = 'last_valid_ts';

// Operations
import FSItem from '../FSItem.js';
import copy from './operations/copy.js';
import deleteFSEntry from './operations/deleteFSEntry.js';
import getReadURL from './operations/getReadUrl.js';
import getShareLink from './operations/getShareLink.js';
import getShares from './operations/getShares.js';
import listShared from './operations/listShared.js';
import listSharedByMe from './operations/listSharedByMe.js';
import mkdir from './operations/mkdir.js';
import move from './operations/move.js';
import read from './operations/read.js';
import readdir from './operations/readdir.js';
import readdirSubdomains from './operations/readdirSubdomains.js';
import rename from './operations/rename.js';
import revokeReadURL from './operations/revokeReadUrl.js';
import share from './operations/share.js';
import sign from './operations/sign.js';
import space from './operations/space.js';
import stat from './operations/stat.js';
import unshare from './operations/unshare.js';
import upload from './operations/upload/index.js';
import write from './operations/write.js';

/**
 * The Cloud Storage API. Lets you store and manage files and directories in
 * the cloud.
 *
 * Operation implementations live under `operations/` as `this`-context
 * functions whose JSDoc (including the per-form `@overload` declarations) is
 * the source of truth for the public signatures — `types/` is generated from
 * it, never edited by hand.
 */
export class MixtJSFileSystemModule extends MixtModule {

    space = space;
    mkdir = mkdir;
    copy = copy;
    rename = rename;
    upload = upload;
    read = read;
    // Why is this called deleteFSEntry instead of just delete? because delete is
    // a reserved keyword in javascript.
    delete = deleteFSEntry;
    move = move;
    write = write;
    sign = sign;
    getReadURL = getReadURL;
    revokeReadURL = revokeReadURL;
    readdir = readdir;
    readdirSubdomains = readdirSubdomains;
    stat = stat;

    // Sharing
    share = share;
    unshare = unshare;
    listShared = listShared;
    listSharedByMe = listSharedByMe;
    getShares = getShares;
    getShareLink = getShareLink;

    FSItem = FSItem;

    /**
     * Connects the socket used for cache invalidation and upload progress.
     * Unlike the request-based modules, the socket carries the token from the
     * moment it connects, so it has to be rebuilt whenever auth state changes.
     *
     * @param {import('../../index.js').Mixt} mixt
     */
    constructor (mixt) {
        super(mixt);
        this.cacheUpdateTimer = null;
        // Connect socket, unless this client opted out (see `mixt.socketEnabled`).
        if (mixt.socketEnabled) {
            this.initializeSocket();
        }
        mixt.onAuthStateChanged(() => this.onAuthStateChanged());
    }

    /**
     * Initializes the socket connection to the server using the current API origin.
     * If a socket connection already exists, it disconnects it before creating a new one.
     * Sets up various event listeners on the socket to handle different socket events like
     * connect, disconnect, reconnect, reconnect_attempt, reconnect_error, reconnect_failed, and error.
     *
     * @memberof FileSystem
     * @returns {void}
     */
    initializeSocket () {
        if ( this.socket ) {
            this.socket.disconnect();
        }

        this.socket = io(this.APIOrigin, {
            auth: {
                auth_token: this.authToken,
            },
            // socket.io's autoUnref path expects ws._socket.unref() to exist.
            // Enable it only for Node runtimes that expose a ws-like WebSocket.
            autoUnref: this.shouldUseSocketAutoUnref(),
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });

        this.bindSocketEvents();
    }

    shouldUseSocketAutoUnref () {
        return socketAutoUnref(this.mixt);
    }

    bindSocketEvents () {
        this.socket.on('item.renamed', (item) => {
            mixt._cache.flushall();
        });

        this.socket.on('item.removed', (item) => {
            // check original_client_socket_id and if it matches this.socket.id, don't invalidate cache
            mixt._cache.flushall();
        });

        this.socket.on('item.added', (item) => {
            // remove readdir cache for parent
            mixt._cache.del(mixt.fsCacheKey('readdir', path.dirname(item.path)));
            // remove item cache for parent directory
            mixt._cache.del(mixt.fsCacheKey('item', path.dirname(item.path)));
        });

        this.socket.on('item.updated', (item) => {
            mixt._cache.flushall();
        });

        this.socket.on('item.moved', (item) => {
            mixt._cache.flushall();
        });

        this.socket.on('connect', () => {
            if ( mixt.debugMode )
            {
                console.log('FileSystem Socket: Connected', this.socket.id);
            }
        });

        this.socket.on('disconnect', () => {
            if ( mixt.debugMode )
            {
                console.log('FileSystem Socket: Disconnected');
            }
        });

        this.socket.on('reconnect', (attempt) => {
            if ( mixt.debugMode )
            {
                console.log('FileSystem Socket: Reconnected', this.socket.id);
            }
        });

        this.socket.on('reconnect_attempt', (attempt) => {
            if ( mixt.debugMode )
            {
                console.log('FileSystem Socket: Reconnection Attemps', attempt);
            }
        });

        this.socket.on('reconnect_error', (error) => {
            if ( mixt.debugMode )
            {
                console.log('FileSystem Socket: Reconnection Error', error);
            }
        });

        this.socket.on('reconnect_failed', () => {
            if ( mixt.debugMode )
            {
                console.log('FileSystem Socket: Reconnection Failed');
            }
        });

        this.socket.on('error', (error) => {
            if ( mixt.debugMode )
            {
                console.error('FileSystem Socket Error:', error);
            }
        });
    }

    /**
     * Reconnects the socket against the current token and API origin. Called
     * by the SDK whenever either changes.
     *
     * @memberof [FileSystem]
     * @returns {void}
     */
    onAuthStateChanged () {
        // Check cache timestamp and purge if needed (only in GUI environment)
        if ( this.mixt.env === 'gui' ) {
            this.checkCacheAndPurge();
            // Start background task to update LAST_VALID_TS every 1 second
            this.startCacheUpdateTimer();
        }

        if ( this.mixt.socketEnabled ) {
            this.initializeSocket();
        }
    }

    /**
     * The cache-related actions after local and remote updates.
     *
     * @memberof MixtJSFileSystemModule
     * @returns {void}
     */
    invalidateCache () {
        // Action: Update last valid time
        // Set to 0, which means the cache is not up to date.
        localStorage.setItem(LAST_VALID_TS, '0');
        mixt._cache.flushall();
    }

    /**
     * Calls the cache API to get the last change timestamp from the server.
     *
     * @memberof MixtJSFileSystemModule
     * @returns {Promise<number>} The timestamp from the server
     */
    async getCacheTimestamp () {
        return new Promise((resolve, reject) => {
            const xhr = utils.initXhr('/cache/last-change-timestamp', this.APIOrigin, this.authToken, 'get', 'application/json');

            // set up event handlers for load and error events
            utils.setupXhrEventHandlers(xhr, undefined, undefined, async (result) => {
                try {
                    const response = typeof result === 'string' ? JSON.parse(result) : result;
                    resolve(response.timestamp || Date.now());
                } catch (e) {
                    reject(new Error('Failed to parse response'));
                }
            }, reject);

            xhr.send();
        });
    }

    /**
     * Checks cache timestamp and purges cache if needed.
     * Only runs in GUI environment.
     *
     * @memberof MixtJSFileSystemModule
     * @returns {void}
     */
    async checkCacheAndPurge () {
        try {
            const serverTimestamp = await this.getCacheTimestamp();
            const localValidTs = parseInt(localStorage.getItem(LAST_VALID_TS)) || 0;

            if ( serverTimestamp - localValidTs > 2000 ) {
                // Server has newer data, purge local cache
                mixt._cache.flushall();
                localStorage.setItem(LAST_VALID_TS, '0');
            }
        } catch ( error ) {
            // If we can't get the server timestamp, silently fail
            // This ensures the socket initialization doesn't break
            console.error('Error checking cache timestamp:', error);
        }
    }

    /**
     * Starts the background task to update LAST_VALID_TS every 1 second.
     * Only runs in GUI environment.
     *
     * @memberof MixtJSFileSystemModule
     * @returns {void}
     */
    startCacheUpdateTimer () {
        if ( this.mixt.env !== 'gui' ) {
            return;
        }

        // The auth token is set more than once over a session, and each call
        // lands here; without clearing first, every call would leave another
        // interval running.
        this.stopCacheUpdateTimer();

        this.cacheUpdateTimer = setInterval(() => {
            localStorage.setItem(LAST_VALID_TS, Date.now().toString());
        }, 1000);
    }

    /**
     * Stops the background cache update timer.
     *
     * @memberof MixtJSFileSystemModule
     * @returns {void}
     */
    stopCacheUpdateTimer () {
        if ( this.cacheUpdateTimer ) {
            clearInterval(this.cacheUpdateTimer);
            this.cacheUpdateTimer = null;
        }
    }
}

/**
 * The public face of the module: derived from the class, with the internal
 * `mixt` handle, the socket plumbing, and the legacy `authToken` accessor
 * omitted.
 *
 * @typedef {import('../../lib/types.js').OmitMembers<
 *     typeof MixtJSFileSystemModule,
 *     'mixt' | 'authToken'
 *     | 'socket' | 'cacheUpdateTimer'
 *     | 'initializeSocket' | 'shouldUseSocketAutoUnref' | 'bindSocketEvents'
 *     | 'onAuthStateChanged' | 'invalidateCache'
 *     | 'startCacheUpdateTimer' | 'stopCacheUpdateTimer'
 * >} FSConstructor
 */

export const FS = /** @type {FSConstructor} */ (MixtJSFileSystemModule);
