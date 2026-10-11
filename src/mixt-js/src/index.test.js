// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('socket.io-client', () => ({
    io: () => ({
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
    }),
}));
// Node/worker polyfills; their CommonJS export branch trips the test module
// runner, and jsdom provides the real thing.
vi.mock('./lib/polyfills/localStorage.js', () => ({ default: {} }));
vi.mock('./lib/polyfills/xhrshim.js', () => ({ default: class {} }));

const LAUNCH = '?mixt.app_instance_id=i&mixt.auth.token=';
const STORAGE_KEY = 'mixt.auth.token.v2';
const ORIGIN_KEY = 'mixt.auth.token.origin.v2';

const b64url = (value) => Buffer.from(value).toString('base64url');
const jwt = (payload) =>
    `${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify(payload))}.sig`;

// Shapes match the compressed claims the backend signs.
const GUI_TOKEN = jwt({ t: 'gui', v: '2', uu: 'AAAAAAAAAAAAAAAAAAAAAA==' });
const APP_TOKEN = jwt({
    t: 'au',
    v: '2',
    au: Buffer.alloc(16, 1).toString('base64'),
});
const GODMODE_TOKEN = jwt({
    t: 't',
    v: '2',
    token_uid: 'tok',
    full_access: true,
    godmode_app_uid: 'app-1',
});

// Every test boots a fresh SDK, and a custom element can't be defined twice.
const origDefine = customElements.define.bind(customElements);
customElements.define = (name, cls) =>
    customElements.get(name) || origDefine(name, cls);

const origParent = Object.getOwnPropertyDescriptor(globalThis, 'parent');
const origFetch = globalThis.fetch;
const origXHR = globalThis.XMLHttpRequest;

// Boot requests are fired but never answered.
class StubXHR {
    open() {}
    setRequestHeader() {}
    addEventListener() {}
    send() {}
}

/** Boots a fresh SDK as an app framed at `search`. */
const bootApp = async (search) => {
    history.replaceState(null, '', `/app/index.html${search}`);
    vi.resetModules();
    const { mixt } = await import('./index.js');
    return mixt;
};

/** Constructs an SDK as a top-level third-party page at `search`. */
const bootWeb = async (search) => {
    history.replaceState(null, '', `/site/index.html${search}`);
    vi.resetModules();
    // The module's own instance boots as Node here and goes unused.
    const { Mixt } = await import('./index.js');
    Object.defineProperty(globalThis, 'parent', {
        value: globalThis,
        configurable: true,
    });
    // The SDK reads a global `process` as "running under Node".
    vi.stubGlobal('process', undefined);
    try {
        return new Mixt();
    } finally {
        vi.unstubAllGlobals();
    }
};

/** Lets the deferred address-bar cleanup run. */
const afterLoad = async () => {
    window.dispatchEvent(new Event('load'));
    await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(globalThis, 'parent', {
        value: { postMessage: vi.fn() },
        configurable: true,
    });
    Object.defineProperty(document, 'readyState', {
        value: 'loading',
        configurable: true,
    });
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    globalThis.XMLHttpRequest = StubXHR;
});

afterEach(() => {
    if ( origParent ) Object.defineProperty(globalThis, 'parent', origParent);
    delete document.readyState;
    globalThis.fetch = origFetch;
    globalThis.XMLHttpRequest = origXHR;
});

describe('app-mode launch token', () => {
    it('keeps the token in the URL until load, then strips only it', async () => {
        const mixt = await bootApp(
            `${LAUNCH}${APP_TOKEN}&mixt.item.name=a%20b#frag`,
        );
        expect(mixt.env).toBe('app');
        expect(mixt.authToken).toBe(APP_TOKEN);

        // Still readable to the app's own boot code.
        const params = new URLSearchParams(location.search);
        expect(params.get('mixt.auth.token')).toBe(APP_TOKEN);

        await afterLoad();
        expect(location.search).toBe(
            '?mixt.app_instance_id=i&mixt.item.name=a%20b',
        );
        expect(location.hash).toBe('#frag');
        expect(mixt.authToken).toBe(APP_TOKEN);
    });

    it('still persists an app token, so a reload keeps working', async () => {
        await bootApp(`${LAUNCH}${APP_TOKEN}`);
        expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_TOKEN);

        await afterLoad();
        const reloaded = await bootApp(location.search);
        expect(reloaded.authToken).toBe(APP_TOKEN);
    });

    it('keeps a godmode session token out of localStorage', async () => {
        const mixt = await bootApp(`${LAUNCH}${GUI_TOKEN}`);
        expect(mixt.authToken).toBe(GUI_TOKEN);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(ORIGIN_KEY)).toBeNull();
        expect(sessionStorage.getItem(STORAGE_KEY)).toBe(GUI_TOKEN);
    });

    it('keeps a godmode app signed in across a frame reload', async () => {
        await bootApp(`${LAUNCH}${GUI_TOKEN}`);
        await afterLoad();
        expect(location.search).not.toContain('mixt.auth.token');

        const reloaded = await bootApp(location.search);
        expect(reloaded.authToken).toBe(GUI_TOKEN);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('drops the sessionStorage copy when an app token takes over', async () => {
        const mixt = await bootApp(`${LAUNCH}${GUI_TOKEN}`);
        mixt.setAuthToken(APP_TOKEN);
        expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_TOKEN);
    });

    it('drops the sessionStorage copy on sign-out', async () => {
        const mixt = await bootApp(`${LAUNCH}${GUI_TOKEN}`);
        mixt.resetAuthToken();
        expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not replay a stored godmode token to another API origin', async () => {
        sessionStorage.setItem(STORAGE_KEY, GUI_TOKEN);
        sessionStorage.setItem(ORIGIN_KEY, 'https://api.mixt.mpl');

        const mixt = await bootApp(
            '?mixt.app_instance_id=i&mixt.api_origin=https://api.evil.example',
        );
        expect(mixt.authToken).not.toBe(GUI_TOKEN);
    });

    it('purges a stored session token without adopting it', async () => {
        localStorage.setItem(STORAGE_KEY, GUI_TOKEN);
        localStorage.setItem(ORIGIN_KEY, 'https://api.mixt.mpl');

        const mixt = await bootApp('?mixt.app_instance_id=i');
        expect(mixt.authToken).toBeNull();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(localStorage.getItem(ORIGIN_KEY)).toBeNull();
    });

    it('keeps a godmode launch token in sessionStorage only', async () => {
        const mixt = await bootApp(`${LAUNCH}${GODMODE_TOKEN}`);
        expect(mixt.authToken).toBe(GODMODE_TOKEN);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(sessionStorage.getItem(STORAGE_KEY)).toBe(GODMODE_TOKEN);

        await afterLoad();
        const reloaded = await bootApp(location.search);
        expect(reloaded.authToken).toBe(GODMODE_TOKEN);
    });

    it('takes a renewed token only from the embedding desktop', async () => {
        const mixt = await bootApp(`${LAUNCH}${GODMODE_TOKEN}`);
        const renewed = jwt({
            t: 't',
            token_uid: 'tok2',
            full_access: true,
            godmode_app_uid: 'app-1',
        });

        window.dispatchEvent(
            new MessageEvent('message', {
                origin: mixt.defaultGUIOrigin,
                source: window,
                data: { msg: 'mixt.token', token: renewed },
            }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(mixt.authToken).toBe(GODMODE_TOKEN);

        window.dispatchEvent(
            new MessageEvent('message', {
                origin: mixt.defaultGUIOrigin,
                source: globalThis.parent,
                data: { msg: 'mixt.token', token: renewed },
            }),
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(mixt.authToken).toBe(renewed);
    });

    it('leaves a stored app token alone on a godmode launch', async () => {
        localStorage.setItem(STORAGE_KEY, APP_TOKEN);
        localStorage.setItem(ORIGIN_KEY, 'https://api.mixt.mpl');

        const mixt = await bootApp(`${LAUNCH}${GUI_TOKEN}`);
        expect(mixt.authToken).toBe(GUI_TOKEN);
        expect(localStorage.getItem(STORAGE_KEY)).toBe(APP_TOKEN);
    });
});

describe('token adoption on a top-level page', () => {
    it('takes a token from a window it opened, and from nothing else', async () => {
        const mixt = await bootWeb('');
        expect(mixt.env).toBe('web');
        // Top-level: `parent` is the page itself, so there is no embedder.
        expect(globalThis.parent).toBe(globalThis);

        const stranger = { closed: false };
        expect(mixt.tokenSourceAllowed_(stranger)).toBe(false);

        const popup = { closed: false };
        mixt.trackOpenedWindow_(popup);
        expect(mixt.tokenSourceAllowed_(popup)).toBe(true);

        // Still ours once closed: it may post, then close itself.
        popup.closed = true;
        expect(mixt.tokenSourceAllowed_(popup)).toBe(true);
    });
});

describe('web-mode stored token', () => {
    it('purges a stored session token on a third-party page', async () => {
        localStorage.setItem(STORAGE_KEY, GUI_TOKEN);
        localStorage.setItem(ORIGIN_KEY, 'https://api.mixt.mpl');

        const mixt = await bootWeb('');
        expect(mixt.env).toBe('web');
        expect(mixt.authToken).toBeNull();
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('persists a session token nowhere on a third-party page', async () => {
        const mixt = await bootWeb('');
        mixt.setAuthToken(GUI_TOKEN);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
        expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not touch a query token it never consumed', async () => {
        const mixt = await bootWeb('?auth_token=sites-own-param');
        expect(mixt.env).toBe('web');
        await afterLoad();
        expect(location.search).toBe('?auth_token=sites-own-param');
    });
});

describe('GUI cache refresh', () => {
    it('keeps one refresh loop however often the token is set', async () => {
        const mixt = await bootApp(`${LAUNCH}${APP_TOKEN}`);
        mixt.env = 'gui';
        const refresh = vi
            .spyOn(mixt, 'checkAndUpdateGUIFScache')
            .mockImplementation(() => {});
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        try {
            mixt.setAuthToken(APP_TOKEN);
            mixt.setAuthToken(APP_TOKEN);
            mixt.setAuthToken(APP_TOKEN);
            vi.advanceTimersByTime(10_000);
            expect(refresh).toHaveBeenCalledOnce();
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('GUI message listener', () => {
    /** Boots an app and returns the window listener it adds last. */
    const bootWithListener = async () => {
        const add = vi.spyOn(window, 'addEventListener');
        try {
            const mixt = await bootApp(`${LAUNCH}${APP_TOKEN}`);
            const [, handler] = add.mock.calls
                .filter(([type]) => type === 'message')
                .at(-1);
            return { mixt, handler };
        } finally {
            add.mockRestore();
        }
    };

    it('ignores a GUI message with no data', async () => {
        const { mixt, handler } = await bootWithListener();
        await expect(
            handler({ origin: mixt.defaultGUIOrigin, data: null }),
        ).resolves.toBeUndefined();
    });

    it('reports a failed user lookup after sign-in', async () => {
        const { mixt, handler } = await bootWithListener();
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const unhandled = vi.fn();
        process.on('unhandledRejection', unhandled);
        try {
            mixt.onAuth = vi.fn();
            mixt.getUser = vi.fn(async () => {
                throw new Error('offline');
            });
            await handler({
                origin: mixt.defaultGUIOrigin,
                source: globalThis.parent,
                data: { msg: 'mixt.token', token: APP_TOKEN },
            });
            await new Promise((resolve) => setTimeout(resolve, 0));
            expect(unhandled).not.toHaveBeenCalled();
            expect(mixt.onAuth).not.toHaveBeenCalled();
            expect(error).toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', unhandled);
            error.mockRestore();
        }
    });
});
