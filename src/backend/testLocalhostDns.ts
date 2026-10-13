// Test-only: resolve *.localhost (e.g. api.localhost, workers.localhost) to
// loopback. Some hosts (minimal containers, certain resolvers) do not resolve
// the RFC 6761 .localhost names, which made HTTP tests fail with ENOTFOUND.
import dns from 'node:dns';
import net from 'node:net';
import { installOfflineNetworkGuard } from './util/offlineNetwork';

const originalLookup = dns.lookup.bind(dns) as typeof dns.lookup;
const isLocalhostName = (host: unknown): host is string =>
    typeof host === 'string' &&
    (host === 'localhost' || host.endsWith('.localhost'));

const patchedLookup = ((hostname: string, options: any, callback?: any) => {
    const cb = typeof options === 'function' ? options : callback;
    const opts = typeof options === 'function' ? {} : (options ?? {});
    if (isLocalhostName(hostname) && net.isIP(hostname) === 0) {
        if (opts.all) return cb(null, [{ address: '127.0.0.1', family: 4 }]);
        return cb(null, '127.0.0.1', 4);
    }
    return (originalLookup as any)(hostname, options, callback);
}) as typeof dns.lookup;

(dns as any).lookup = patchedLookup;

// Same offline guard as the backend, layered over the localhost mapping above.
installOfflineNetworkGuard();
