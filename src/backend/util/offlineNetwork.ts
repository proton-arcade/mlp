/*
 * Offline network guard.
 *
 * Mixt runs fully local. Nothing the backend does may reach an address outside
 * this machine or its private network: no outbound HTTP(S) to the internet, no
 * SMTP relay on the internet, no OAuth discovery, no SMS API, no Cloudflare API.
 *
 * The guard enforces that at the two points every outbound connection passes
 * through, so it also covers code that we do not control (fetch, nodemailer,
 * pg, mysql, ioredis, the AWS SDK):
 *
 *   - `dns.lookup`: every resolved address must be loopback or private. A name
 *     that resolves to a public address fails with ERR_EXTERNAL_NETWORK_DISABLED.
 *   - `net.Socket#connect`: an IP literal that is not loopback or private fails
 *     before any packet is sent (Node skips DNS for IP literals).
 *
 * Local names keep working: `localhost`, `*.localhost`, and single-label docker
 * service names (`dynamo`, `s3`, `redis`) resolve to private addresses.
 *
 * Set MIXT_ALLOW_EXTERNAL_NETWORK=1 to turn the guard off (not recommended).
 * It is installed by the backend entry point (src/backend/index.ts) and by the
 * test setup.
 */
import dns from 'node:dns';
import net from 'node:net';

export const ALLOW_EXTERNAL_NETWORK_ENV = 'MIXT_ALLOW_EXTERNAL_NETWORK';
export const EXTERNAL_NETWORK_ERROR_CODE = 'ERR_EXTERNAL_NETWORK_DISABLED';

export class ExternalNetworkDisabledError extends Error {
    readonly code = EXTERNAL_NETWORK_ERROR_CODE;
    constructor(host: string) {
        super(
            `Mixt is offline: refusing to connect to ${host}. ` +
                'Only this machine and private networks are reachable. ' +
                `Set ${ALLOW_EXTERNAL_NETWORK_ENV}=1 to allow external network access.`,
        );
        this.name = 'ExternalNetworkDisabledError';
    }
}

/** Strip an IPv4-mapped IPv6 prefix (`::ffff:10.0.0.5` -> `10.0.0.5`). */
const unmap = (address: string): string => {
    const lower = address.toLowerCase();
    return lower.startsWith('::ffff:') && net.isIPv4(lower.slice(7))
        ? lower.slice(7)
        : lower;
};

/**
 * True for loopback, unspecified, and private-network addresses. Link-local
 * IPv4 (169.254/16, which includes the cloud metadata address) and CGNAT space
 * (100.64/10) are not local.
 */
export const isLocalAddress = (address: string): boolean => {
    const addr = unmap(address);
    if (net.isIPv4(addr)) {
        const [a, b] = addr.split('.').map(Number);
        if (a === 127 || a === 0) return true; // loopback, unspecified
        if (a === 10) return true; // 10/8
        if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
        if (a === 192 && b === 168) return true; // 192.168/16
        return false;
    }
    if (net.isIPv6(addr)) {
        if (addr === '::1' || addr === '::') return true;
        if (/^f[cd][0-9a-f]{2}:/.test(addr)) return true; // fc00::/7 ULA
        if (/^fe[89ab][0-9a-f]:/.test(addr)) return true; // fe80::/10 link-local
        return false;
    }
    return false;
};

/**
 * True when a hostname is local by name alone (no DNS needed):
 * `localhost`, `*.localhost`, or a single label such as a docker service name.
 */
export const isLocalHostname = (host: string): boolean => {
    const h = host.toLowerCase().replace(/\.$/, '');
    if (net.isIP(h)) return isLocalAddress(h);
    if (h === 'localhost' || h.endsWith('.localhost')) return true;
    return !h.includes('.');
};

export const externalNetworkAllowed = (): boolean => {
    const v = (process.env[ALLOW_EXTERNAL_NETWORK_ENV] ?? '').toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
};

let installed = false;

/** Install the guard once. A no-op when external access is explicitly allowed. */
export const installOfflineNetworkGuard = (): void => {
    if (installed || externalNetworkAllowed()) return;
    installed = true;

    const originalLookup = dns.lookup;
    const guardedLookup = function (
        this: unknown,
        hostname: string,
        options: unknown,
        callback?: unknown,
    ) {
        const cb = (
            typeof options === 'function' ? options : callback
        ) as (...args: unknown[]) => void;
        const opts = (
            typeof options === 'function'
                ? {}
                : typeof options === 'number'
                  ? { family: options }
                  : (options ?? {})
        ) as { all?: boolean };
        (originalLookup as any)(hostname, opts, (err: Error | null, address: any, family: number) => {
            if (err) return cb(err);
            const addresses: string[] = Array.isArray(address)
                ? address.map((a: { address: string }) => a.address)
                : [address];
            const external = addresses.find((a) => !isLocalAddress(a));
            if (external !== undefined) {
                const e = new ExternalNetworkDisabledError(
                    `${hostname} (${external})`,
                );
                return cb(e);
            }
            cb(null, address, family);
        });
    };
    (dns as any).lookup = guardedLookup;

    // dns.promises.lookup is a separate implementation, so it needs its own wrapper.
    (dns.promises as any).lookup = (hostname: string, options?: unknown) =>
        new Promise((resolve, reject) => {
            guardedLookup.call(dns, hostname, options ?? {}, (err: Error | null, address: any, family: number) => {
                if (err) return reject(err);
                const wantAll = typeof options === 'object' && options !== null && (options as { all?: boolean }).all === true;
                resolve(wantAll ? address : { address, family });
            });
        });

    const originalConnect = net.Socket.prototype.connect;
    (net.Socket.prototype as any).connect = function (
        this: net.Socket,
        ...args: unknown[]
    ) {
        // net.connect() passes its normalized arguments as one array: [options, cb].
        const first = Array.isArray(args[0]) ? args[0][0] : args[0];
        let host: string | undefined;
        if (first !== null && typeof first === 'object') {
            host = (first as { host?: string }).host ?? 'localhost';
        } else if (typeof first === 'number') {
            host = typeof args[1] === 'string' ? args[1] : 'localhost';
        }
        if (host !== undefined && net.isIP(host) && !isLocalAddress(host)) {
            const err = new ExternalNetworkDisabledError(host);
            process.nextTick(() => this.destroy(err));
            return this;
        }
        return (originalConnect as any).apply(this, args);
    };
};

/** Test helper: reset module state so the guard can be installed again. */
export const _resetOfflineNetworkGuardForTests = (): void => {
    installed = false;
};
