/*
 * Copyright (C) 2024-present Puter Technologies Inc.
 *
 * This file is part of Puter.
 *
 * Puter is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { MixtServer } from '../server.js';
import { setupTestServer } from '../testUtil.js';
import {
    buildHostedBackingDenial,
    buildHostedSubdomainIndexUrlCandidates,
    extractMixtHostedSubdomain,
    getMixtHostedDomains,
    hostedIndexUrlBackingIsUnavailable,
    hostedIndexUrlBackingsAreUnavailable,
} from './hostedAppBacking.js';

// Pure-unit companion to the integration coverage in
// `AppDriver.test.ts` / `SuggestedAppsService.test.ts`. Those prove the
// guard is wired into each launch-metadata producer; these pin the
// decision logic itself, including branches that are awkward to provoke
// against a live store (replica lag, malformed owner ids, lookup errors).

const CONFIG = {
    static_hosting_domain: 'site.localhost',
    static_hosting_domain_alt: 'mixt.site',
    private_app_hosting_domain: 'private.localhost',
};

const fakeStore = (
    impl: (
        subdomain: string,
        opts?: { primary?: boolean },
    ) => Promise<Record<string, unknown> | null>,
) => ({ getBySubdomain: vi.fn(impl) }) as never;

describe('getMixtHostedDomains', () => {
    it('collects, normalizes, and dedupes the configured domains', () => {
        expect(
            getMixtHostedDomains({
                static_hosting_domain: '  .Mixt.Site  ',
                static_hosting_domain_alt: 'mixt.site',
                private_app_hosting_domain: 'private.localhost:4100',
            }).sort(),
        ).toEqual(['mixt.site', 'private.localhost']);
    });

    it('ignores absent and non-string config values', () => {
        expect(getMixtHostedDomains(undefined)).toEqual([]);
        expect(getMixtHostedDomains(null)).toEqual([]);
        expect(
            getMixtHostedDomains({
                static_hosting_domain: '',
                static_hosting_domain_alt: 42 as unknown as string,
            }),
        ).toEqual([]);
    });
});

describe('buildHostedSubdomainIndexUrlCandidates', () => {
    it('covers every hosting domain, protocol and path variant', () => {
        const candidates = buildHostedSubdomainIndexUrlCandidates('myapp', {
            static_hosting_domain: 'mixt.site',
            protocol: 'https:',
        });
        expect(candidates).toEqual(
            expect.arrayContaining([
                'https://myapp.mixt.site',
                'https://myapp.mixt.site/',
                'https://myapp.mixt.site/index.html',
                'http://myapp.mixt.site',
                'http://myapp.mixt.site/',
                'http://myapp.mixt.site/index.html',
            ]),
        );
        // Nothing beyond the three path shapes the app write path accepts.
        expect(candidates).toHaveLength(6);
    });

    it('keeps both the ported and bare host for dev configs', () => {
        const candidates = buildHostedSubdomainIndexUrlCandidates('dev', {
            static_hosting_domain: 'site.localhost:4100',
            protocol: 'http',
        });
        expect(candidates).toContain('http://dev.site.localhost:4100/');
        expect(candidates).toContain('http://dev.site.localhost/');
    });

    it('spans the alt and private hosting domains', () => {
        const candidates = buildHostedSubdomainIndexUrlCandidates('x', CONFIG);
        expect(candidates).toContain('https://x.mixt.site/');
        expect(candidates).toContain('https://x.site.localhost/');
        expect(candidates).toContain('https://x.private.localhost/');
    });

    it('normalizes the name and refuses unusable input', () => {
        expect(
            buildHostedSubdomainIndexUrlCandidates('  MyApp  ', {
                static_hosting_domain: 'mixt.site',
            }),
        ).toContain('https://myapp.mixt.site/');
        expect(buildHostedSubdomainIndexUrlCandidates('', CONFIG)).toEqual([]);
        expect(buildHostedSubdomainIndexUrlCandidates(null, CONFIG)).toEqual(
            [],
        );
        expect(buildHostedSubdomainIndexUrlCandidates(42, CONFIG)).toEqual([]);
        // No hosting domain configured — nothing can be hosted, so nothing
        // is reserved.
        expect(buildHostedSubdomainIndexUrlCandidates('x', {})).toEqual([]);
    });
});

describe('extractMixtHostedSubdomain', () => {
    it('extracts the label from a hosted url', () => {
        expect(
            extractMixtHostedSubdomain('https://myapp.mixt.site/', CONFIG),
        ).toBe('myapp');
    });

    it('matches the alt and private hosting domains too', () => {
        expect(
            extractMixtHostedSubdomain(
                'https://a.site.localhost/index.html',
                CONFIG,
            ),
        ).toBe('a');
        expect(
            extractMixtHostedSubdomain(
                'https://b.private.localhost/',
                CONFIG,
            ),
        ).toBe('b');
    });

    it('lowercases the hostname and ignores port and path', () => {
        expect(
            extractMixtHostedSubdomain(
                'https://MyApp.Mixt.Site:8080/a/b?c=d#e',
                CONFIG,
            ),
        ).toBe('myapp');
    });

    it('prefers the longest matching hosting domain', () => {
        // `x.site.localhost` ends with both `site.localhost`
        // and (hypothetically) a shorter configured suffix. Longest wins,
        // so the label is `x` — not `x.site`.
        expect(
            extractMixtHostedSubdomain('https://x.site.localhost/', {
                ...CONFIG,
                private_app_hosting_domain_alt: 'localhost',
            }),
        ).toBe('x');
    });

    it('returns null for non-hosted, bare, and malformed urls', () => {
        expect(
            extractMixtHostedSubdomain('https://example.com/', CONFIG),
        ).toBeNull();
        // The apex domain itself has no subdomain label.
        expect(
            extractMixtHostedSubdomain('https://mixt.site/', CONFIG),
        ).toBeNull();
        expect(extractMixtHostedSubdomain('not a url', CONFIG)).toBeNull();
        expect(extractMixtHostedSubdomain('', CONFIG)).toBeNull();
        expect(extractMixtHostedSubdomain(null, CONFIG)).toBeNull();
        expect(extractMixtHostedSubdomain(undefined, CONFIG)).toBeNull();
        expect(extractMixtHostedSubdomain(123, CONFIG)).toBeNull();
    });

    it('returns null when no hosting domains are configured', () => {
        expect(
            extractMixtHostedSubdomain('https://myapp.mixt.site/', {}),
        ).toBeNull();
    });
});

describe('hostedIndexUrlBackingIsUnavailable', () => {
    it('is false for a non-hosted index_url without touching the store', async () => {
        const store = fakeStore(async () => null);
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://example.com/',
                    owner_user_id: 1,
                },
                subdomainStore: store,
                config: CONFIG,
            }),
        ).toBe(false);
        expect(
            (store as unknown as { getBySubdomain: ReturnType<typeof vi.fn> })
                .getBySubdomain,
        ).not.toHaveBeenCalled();
    });

    it('is false when the subdomain is still owned by the app owner', async () => {
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://mine.mixt.site/',
                    owner_user_id: 7,
                },
                subdomainStore: fakeStore(async () => ({ user_id: 7 })),
                config: CONFIG,
            }),
        ).toBe(false);
    });

    it('is true when the subdomain no longer exists', async () => {
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://gone.mixt.site/',
                    owner_user_id: 7,
                },
                subdomainStore: fakeStore(async () => null),
                config: CONFIG,
            }),
        ).toBe(true);
    });

    it('is true when the subdomain was reclaimed by another user', async () => {
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://taken.mixt.site/',
                    owner_user_id: 7,
                },
                subdomainStore: fakeStore(async () => ({ user_id: 99 })),
                config: CONFIG,
            }),
        ).toBe(true);
    });

    it('re-checks the primary before declaring a replica miss dangling', async () => {
        // Mirrors the create/update ownership check: a freshly-created
        // subdomain may not have reached the replica yet, so a miss must
        // be confirmed against the primary rather than treated as gone.
        const getBySubdomain = vi.fn(
            async (_sub: string, opts?: { primary?: boolean }) =>
                opts?.primary ? { user_id: 7 } : null,
        );
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://fresh.mixt.site/',
                    owner_user_id: 7,
                },
                subdomainStore: { getBySubdomain } as never,
                config: CONFIG,
            }),
        ).toBe(false);
        expect(getBySubdomain).toHaveBeenCalledTimes(2);
        expect(getBySubdomain).toHaveBeenLastCalledWith('fresh', {
            primary: true,
        });
    });

    it('is true when either owner id is not a usable integer', async () => {
        // `undefined` and non-numeric strings coerce to NaN, so neither
        // side can be compared — withhold rather than guess.
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: { index_url: 'https://orphan.mixt.site/' },
                subdomainStore: fakeStore(async () => ({ user_id: 7 })),
                config: CONFIG,
            }),
        ).toBe(true);

        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://orphan.mixt.site/',
                    owner_user_id: 7,
                },
                subdomainStore: fakeStore(async () => ({ user_id: 'abc' })),
                config: CONFIG,
            }),
        ).toBe(true);
    });

    it('is true for an ownerless app even though null coerces to 0', async () => {
        // Origin-bootstrapped apps carry `owner_user_id: null`. That is NOT
        // caught by the integer check — `Number(null)` is 0, a valid
        // integer — it falls through to the id comparison, where 0 can
        // never equal a real subdomain owner id. Pinned because the
        // outcome is right for a non-obvious reason: if the comparison
        // were ever loosened, this case would silently start passing.
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://orphan.mixt.site/',
                    owner_user_id: null,
                },
                subdomainStore: fakeStore(async () => ({ user_id: 7 })),
                config: CONFIG,
            }),
        ).toBe(true);
    });

    it('compares owner ids across string/number representations', async () => {
        // MySQL and sqlite disagree on whether ids come back as strings;
        // the guard must not read that as a reclaim.
        expect(
            await hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://mine.mixt.site/',
                    owner_user_id: '7',
                },
                subdomainStore: fakeStore(async () => ({ user_id: 7 })),
                config: CONFIG,
            }),
        ).toBe(false);
    });

    it('propagates store errors so callers decide the fail-closed policy', async () => {
        await expect(
            hostedIndexUrlBackingIsUnavailable({
                app: {
                    index_url: 'https://boom.mixt.site/',
                    owner_user_id: 7,
                },
                subdomainStore: fakeStore(async () => {
                    throw new Error('db down');
                }),
                config: CONFIG,
            }),
        ).rejects.toThrow('db down');
    });
});

describe('buildHostedBackingDenial', () => {
    it('denies launch without redirecting to app-center', () => {
        // Empty `fallbackAppName` matters: this isn't an entitlement
        // problem, so the launcher must not bounce the user to a purchase
        // flow for an app whose backing is simply gone.
        expect(buildHostedBackingDenial()).toEqual({
            hasAccess: false,
            fallbackAppName: '',
            reason: 'hosted_backing_unavailable',
            checkedBy: 'core/hosted-subdomain-guard',
        });
    });
});

// Matches the hosting domains in config.default.json, so subdomain rows
// created through the real store resolve the same way `AppDriver` would see
// them in production.
const HOSTING_CONFIG = {
    static_hosting_domain: 'site.localhost',
    static_hosting_domain_alt: 'host.localhost',
    private_app_hosting_domain: 'app.localhost',
    private_app_hosting_domain_alt: 'dev.localhost',
};
const hostedUrl = (sub: string) => `https://${sub}.site.localhost/`;

describe('hostedIndexUrlBackingsAreUnavailable (batched, against a real store)', () => {
    let server: MixtServer;

    beforeAll(async () => {
        server = await setupTestServer();
    });

    afterAll(async () => {
        await server?.shutdown();
    });

    const makeUser = async () => {
        const username = `hab-${Math.random().toString(36).slice(2, 10)}`;
        return server.stores.user.create({
            username,
            uuid: uuidv4(),
            password: null,
            email: `${username}@test.local`,
            free_storage: 100 * 1024 * 1024,
            requires_email_confirmation: false,
        });
    };

    it('resolves a mix of apps in input order with one batched call', async () => {
        const owner = await makeUser();
        const attacker = await makeUser();

        const liveSub = `live-${Math.random().toString(36).slice(2, 8)}`;
        await server.stores.subdomain.create({
            userId: owner.id,
            subdomain: liveSub,
        });
        const reclaimedSub = `reclaimed-${Math.random().toString(36).slice(2, 8)}`;
        await server.stores.subdomain.create({
            userId: attacker.id,
            subdomain: reclaimedSub,
        });
        const danglingSub = `dangling-${Math.random().toString(36).slice(2, 8)}`;

        const external = {
            index_url: 'https://elsewhere.example.com/',
            owner_user_id: owner.id,
        };
        const live = { index_url: hostedUrl(liveSub), owner_user_id: owner.id };
        const reclaimed = {
            index_url: hostedUrl(reclaimedSub),
            owner_user_id: owner.id,
        };
        const dangling = {
            index_url: hostedUrl(danglingSub),
            owner_user_id: owner.id,
        };

        const getBySubdomains = vi.spyOn(
            server.stores.subdomain,
            'getBySubdomains',
        );
        try {
            const results = await hostedIndexUrlBackingsAreUnavailable({
                apps: [external, live, reclaimed, dangling],
                subdomainStore: server.stores.subdomain,
                config: HOSTING_CONFIG,
            });
            // Input order preserved; external → false, live → false, a
            // reclaimed owner → true, a gone subdomain → true.
            expect(results).toEqual([false, false, true, true]);

            // One non-primary batch carrying only the three hosted names —
            // the external app never touches the store.
            expect(getBySubdomains).toHaveBeenCalledTimes(2);
            expect([...getBySubdomains.mock.calls[0]![0]].sort()).toEqual(
                [liveSub, reclaimedSub, danglingSub].sort(),
            );
            // Primary follow-up only for the one name still missing.
            expect(getBySubdomains.mock.calls[1]).toEqual([
                [danglingSub],
                { primary: true },
            ]);
        } finally {
            getBySubdomains.mockRestore();
        }
    });

    it('makes no store call when every app is non-hosted', async () => {
        const owner = await makeUser();
        const external = {
            index_url: 'https://elsewhere.example.com/',
            owner_user_id: owner.id,
        };
        const builtin = { index_url: undefined, owner_user_id: owner.id };

        const getBySubdomains = vi.spyOn(
            server.stores.subdomain,
            'getBySubdomains',
        );
        try {
            const results = await hostedIndexUrlBackingsAreUnavailable({
                apps: [external, builtin],
                subdomainStore: server.stores.subdomain,
                config: HOSTING_CONFIG,
            });
            expect(results).toEqual([false, false]);
            expect(getBySubdomains).not.toHaveBeenCalled();
        } finally {
            getBySubdomains.mockRestore();
        }
    });

    it('does exactly one primary batch covering every still-missing name', async () => {
        const owner = await makeUser();
        const goneA = `gone-a-${Math.random().toString(36).slice(2, 6)}`;
        const goneB = `gone-b-${Math.random().toString(36).slice(2, 6)}`;
        const danglingA = {
            index_url: hostedUrl(goneA),
            owner_user_id: owner.id,
        };
        const danglingB = {
            index_url: hostedUrl(goneB),
            owner_user_id: owner.id,
        };

        const getBySubdomains = vi.spyOn(
            server.stores.subdomain,
            'getBySubdomains',
        );
        try {
            const results = await hostedIndexUrlBackingsAreUnavailable({
                apps: [danglingA, danglingB],
                subdomainStore: server.stores.subdomain,
                config: HOSTING_CONFIG,
            });
            expect(results).toEqual([true, true]);
            expect(getBySubdomains).toHaveBeenCalledTimes(2);
            expect(getBySubdomains.mock.calls[1]![1]).toEqual({
                primary: true,
            });
            expect([...getBySubdomains.mock.calls[1]![0]].sort()).toEqual(
                [goneA, goneB].sort(),
            );
        } finally {
            getBySubdomains.mockRestore();
        }
    });
});
