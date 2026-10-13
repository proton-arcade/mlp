import dns from 'node:dns';
import net from 'node:net';
import { describe, expect, it } from 'vitest';
import {
    EXTERNAL_NETWORK_ERROR_CODE,
    externalNetworkAllowed,
    isLocalAddress,
    isLocalHostname,
} from './offlineNetwork';

describe('isLocalAddress', () => {
    it.each([
        '127.0.0.1',
        '127.8.9.10',
        '10.0.0.5',
        '172.16.0.1',
        '172.31.255.255',
        '192.168.1.20',
        '::1',
        'fd12:3456::1',
        'fe80::1',
        '::ffff:10.1.2.3',
    ])('treats %s as local', (addr) => {
        expect(isLocalAddress(addr)).toBe(true);
    });

    it.each([
        '8.8.8.8',
        '1.1.1.1',
        '172.32.0.1',
        '169.254.169.254', // cloud metadata
        '100.64.0.1', // CGNAT
        '2606:4700:4700::1111',
        '::ffff:8.8.8.8',
    ])('treats %s as external', (addr) => {
        expect(isLocalAddress(addr)).toBe(false);
    });
});

describe('isLocalHostname', () => {
    it.each(['localhost', 'api.localhost', 'mixt.localhost', 'dynamo', 's3', '127.0.0.1'])(
        'accepts %s without DNS',
        (host) => {
            expect(isLocalHostname(host)).toBe(true);
        },
    );

    it.each(['example.com', 'api.cloudflare.com', 'js.mixt.mpl', '8.8.8.8'])(
        'rejects %s by name',
        (host) => {
            expect(isLocalHostname(host)).toBe(false);
        },
    );
});

describe('offline network guard', () => {
    it('refuses an IP-literal connection to an external address', async () => {
        if (externalNetworkAllowed()) return;
        const err = await new Promise<NodeJS.ErrnoException>((resolve) => {
            const socket = net.connect({ host: '8.8.8.8', port: 80 });
            socket.on('error', (e) => resolve(e));
            socket.on('connect', () => resolve(new Error('connected')));
        });
        expect((err as NodeJS.ErrnoException).code).toBe(EXTERNAL_NETWORK_ERROR_CODE);
    });

    it('refuses a lookup that resolves to an external address', async () => {
        if (externalNetworkAllowed()) return;
        await expect(dns.promises.lookup('8.8.8.8')).rejects.toMatchObject({
            code: EXTERNAL_NETWORK_ERROR_CODE,
        });
    });

    it('still allows loopback lookups and connections', async () => {
        const result = await dns.promises.lookup('127.0.0.1');
        expect(result.address).toBe('127.0.0.1');
    });
});
