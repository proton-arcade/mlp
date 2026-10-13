import { beforeEach, describe, expect, it, vi } from 'vitest';

// Captures the admin routes that touch upgrade requests. The rest of admin.ts
// is not exercised here.
const fakeStore = vi.hoisted(() => {
    type U = { id: number; username: string; account_type?: string; metadata?: unknown };
    const users = new Map<string, U>();
    const routes: Record<string, (req: unknown, res: unknown) => Promise<void>> = {};
    const register = (method: string) => (path: string, _opts: unknown, handler: (req: unknown, res: unknown) => Promise<void>) => {
        routes[`${method} ${path}`] = handler;
    };
    return {
        users,
        routes,
        register,
        user: {
            getByUsername: vi.fn(async (name: string) => users.get(name) ?? null),
            update: vi.fn(async () => {}),
            updateMetadata: vi.fn(async (id: number, patch: Record<string, unknown>) => {
                for (const u of users.values()) {
                    if (u.id === id) u.metadata = { ...((u.metadata as object) ?? {}), ...patch };
                }
            }),
            invalidateById: vi.fn(async () => {}),
            getById: vi.fn(async () => null),
            create: vi.fn(async () => null),
            findEmailOwner: vi.fn(async () => null),
        },
    };
});

vi.mock('@mixt/backend/src/extensions', () => ({
    extension: {
        import: () => fakeStore,
        get: vi.fn(),
        post: vi.fn(),
        patch: fakeStore.register('PATCH'),
        delete: fakeStore.register('DELETE'),
    },
}));

// Module loads that admin.ts needs at import time but this test does not use.
vi.mock('@mixt/backend/src/util/email', () => ({ isStorableEmail: () => true }));
vi.mock('@mixt/backend/src/util/userProvisioning', () => ({ generateDefaultFsentries: vi.fn() }));

import '../extensions/admin';

type Res = { statusCode: number; body: unknown; status(c: number): Res; json(b: unknown): Res };
const makeRes = (): Res => ({
    statusCode: 200,
    body: undefined,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
});

const dismiss = async (username: string) => {
    const res = makeRes();
    await fakeStore.routes['DELETE /admin/accounts/:username/upgrade-request'](
        { params: { username }, actor: { user: { username: 'admin' } } },
        res,
    );
    return res;
};

describe('admin view of upgrade requests', () => {
    beforeEach(() => {
        fakeStore.users.clear();
        vi.clearAllMocks();
    });

    it('dismisses a pending request and leaves the type unchanged', async () => {
        fakeStore.users.set('guestuser', {
            id: 1,
            username: 'guestuser',
            account_type: 'guest',
            metadata: { upgrade_request: { requested_type: 'standard', requested_at: '2026-10-13T00:00:00.000Z' } },
        });
        const res = await dismiss('guestuser');
        expect(res.statusCode).toBe(200);
        expect((res.body as { upgrade_request: unknown }).upgrade_request).toBeNull();
        expect(fakeStore.users.get('guestuser')!.metadata).toEqual({ upgrade_request: null });
        expect(fakeStore.users.get('guestuser')!.account_type).toBe('guest');
    });

    it('returns 404 for an unknown account', async () => {
        const res = await dismiss('nobody');
        expect(res.statusCode).toBe(404);
    });

    it('returns 404 when there is no pending request to dismiss', async () => {
        fakeStore.users.set('plain', { id: 2, username: 'plain', account_type: 'guest', metadata: {} });
        const res = await dismiss('plain');
        expect(res.statusCode).toBe(404);
    });

    it('a type change through the account PATCH closes the pending request', async () => {
        fakeStore.users.set('guestuser', {
            id: 1,
            username: 'guestuser',
            account_type: 'guest',
            metadata: { upgrade_request: { requested_type: 'standard', requested_at: '2026-10-13T00:00:00.000Z' } },
        });
        const res = makeRes();
        await fakeStore.routes['PATCH /admin/accounts/:username'](
            {
                params: { username: 'guestuser' },
                body: { account_type: 'standard' },
                actor: { user: { id: 99, username: 'admin', account_type: 'owner' } },
            },
            res,
        );
        expect(res.statusCode).toBe(200);
        expect(fakeStore.users.get('guestuser')!.metadata).toEqual({ upgrade_request: null });
    });
});
