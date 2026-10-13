import { beforeEach, describe, expect, it, vi } from 'vitest';

// The extension module wires routes and imports its stores; replace it with a
// fake so the handlers can be called directly.
const fakeStore = vi.hoisted(() => {
    type U = { id: number; username: string; account_type?: string; metadata?: Record<string, unknown> };
    const users = new Map<number, U>();
    return {
        users,
        user: {
            getById: vi.fn(async (id: number) => (users.get(id) ? { ...users.get(id)! } : null)),
            updateMetadata: vi.fn(async (id: number, patch: Record<string, unknown>) => {
                const u = users.get(id)!;
                u.metadata = { ...(u.metadata ?? {}), ...patch };
            }),
            invalidateById: vi.fn(async () => {}),
        },
    };
});

vi.mock('@mixt/backend/src/extensions', () => ({
    extension: {
        import: () => fakeStore,
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

import {
    handleDeleteUpgradeRequest,
    handleGetUpgradeRequest,
    handlePostUpgradeRequest,
} from './accountUpgrade';

type Res = { statusCode: number; body: unknown; status(c: number): Res; json(b: unknown): Res };
const makeRes = (): Res => {
    const res: Res = {
        statusCode: 200,
        body: undefined,
        status(c) { this.statusCode = c; return this; },
        json(b) { this.body = b; return this; },
    };
    return res;
};

const call = async (
    handler: (req: never, res: never) => Promise<void>,
    user: { id: number } | null,
    body?: unknown,
) => {
    const res = makeRes();
    const req = { actor: user ? { user: { id: user.id } } : undefined, body } as never;
    await handler(req, res as never);
    return res;
};

const seed = (id: number, username: string, account_type: string, metadata: Record<string, unknown> = {}) => {
    fakeStore.users.set(id, { id, username, account_type, metadata });
};

describe('account upgrade requests', () => {
    beforeEach(() => {
        fakeStore.users.clear();
        vi.clearAllMocks();
        seed(1, 'guestuser', 'guest');
        seed(2, 'standarduser', 'standard');
        seed(3, 'devuser', 'developer');
        seed(4, 'adminuser', 'administrator');
    });

    it('lets a guest ask for standard or developer', async () => {
        const std = await call(handlePostUpgradeRequest, { id: 1 }, { account_type: 'standard' });
        expect(std.statusCode).toBe(200);
        expect((std.body as { upgrade_request: { requested_type: string } }).upgrade_request.requested_type).toBe('standard');

        const dev = await call(handlePostUpgradeRequest, { id: 1 }, { account_type: 'developer' });
        expect(dev.statusCode).toBe(200);
        expect((dev.body as { upgrade_request: { requested_type: string } }).upgrade_request.requested_type).toBe('developer');
    });

    it('lets a standard account ask only for developer', async () => {
        const dev = await call(handlePostUpgradeRequest, { id: 2 }, { account_type: 'developer' });
        expect(dev.statusCode).toBe(200);

        const std = await call(handlePostUpgradeRequest, { id: 2 }, { account_type: 'standard' });
        expect(std.statusCode).toBe(400);
        expect((std.body as { code: string }).code).toBe('invalid_account_type');
    });

    it('refuses types that cannot request an upgrade', async () => {
        for (const id of [3, 4]) {
            const res = await call(handlePostUpgradeRequest, { id }, { account_type: 'developer' });
            expect(res.statusCode).toBe(403);
            expect((res.body as { code: string }).code).toBe('upgrade_not_allowed');
        }
    });

    it('rejects an unknown or missing target type', async () => {
        const bad = await call(handlePostUpgradeRequest, { id: 1 }, { account_type: 'administrator' });
        expect(bad.statusCode).toBe(400);
        const missing = await call(handlePostUpgradeRequest, { id: 1 }, {});
        expect(missing.statusCode).toBe(400);
    });

    it('requires a signed-in user', async () => {
        const res = await call(handlePostUpgradeRequest, null, { account_type: 'standard' });
        expect(res.statusCode).toBe(401);
        const get = await call(handleGetUpgradeRequest, null);
        expect(get.statusCode).toBe(401);
        const del = await call(handleDeleteUpgradeRequest, null);
        expect(del.statusCode).toBe(401);
    });

    it('a newer request replaces the older one', async () => {
        await call(handlePostUpgradeRequest, { id: 1 }, { account_type: 'standard' });
        await call(handlePostUpgradeRequest, { id: 1 }, { account_type: 'developer' });
        const get = await call(handleGetUpgradeRequest, { id: 1 });
        expect((get.body as { upgrade_request: { requested_type: string } }).upgrade_request.requested_type).toBe('developer');
    });

    it('withdraws a pending request', async () => {
        await call(handlePostUpgradeRequest, { id: 1 }, { account_type: 'standard' });
        const del = await call(handleDeleteUpgradeRequest, { id: 1 });
        expect(del.statusCode).toBe(200);
        expect((del.body as { upgrade_request: unknown }).upgrade_request).toBeNull();
    });

    it('reports what the account can request', async () => {
        const guest = await call(handleGetUpgradeRequest, { id: 1 });
        expect((guest.body as { can_request: string[] }).can_request).toEqual(['standard', 'developer']);
        const std = await call(handleGetUpgradeRequest, { id: 2 });
        expect((std.body as { can_request: string[] }).can_request).toEqual(['developer']);
        const dev = await call(handleGetUpgradeRequest, { id: 3 });
        expect((dev.body as { can_request: string[] }).can_request).toEqual([]);
    });
});
