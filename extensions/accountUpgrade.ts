import type { Request, Response } from 'express';
import { extension } from '@mixt/backend/src/extensions';
import { effectiveAccountType } from '@mixt/backend/src/util/accountTypes';

/*
 * Account upgrade requests. A signed-in guest may ask for standard or
 * developer; a standard account may ask for developer. The request is kept in
 * the user's metadata as `upgrade_request` until an administrator changes the
 * account's type (which clears it) or the user withdraws it.
 */

const stores = extension.import('store');

const REQUESTABLE: Record<string, readonly string[]> = {
    guest: ['standard', 'developer'],
    standard: ['developer'],
};

type ActorUser = {
    id: number;
    username?: string | null;
    account_type?: unknown;
    metadata?: unknown;
};

const currentRequest = (user: ActorUser) => {
    const meta = (user.metadata ?? {}) as Record<string, unknown>;
    const req = meta.upgrade_request as
        { requested_type?: unknown; requested_at?: unknown } | null | undefined;
    if (!req || typeof req !== 'object') return null;
    return {
        requested_type: req.requested_type ?? null,
        requested_at: req.requested_at ?? null,
    };
};

const getActorUser = (req: Request): ActorUser | null =>
    ((req as unknown as { actor?: { user?: ActorUser } }).actor?.user ??
        null) as ActorUser | null;

const describe = (user: ActorUser) => ({
    account_type: effectiveAccountType(user),
    upgrade_request: currentRequest(user),
    can_request: REQUESTABLE[effectiveAccountType(user)] ?? [],
});

const freshUser = async (user: ActorUser): Promise<ActorUser> =>
    ((await stores.user.getById(user.id)) as ActorUser | null) ?? user;

export const handleGetUpgradeRequest = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const user = getActorUser(req);
    if (!user) {
        res.status(401).json({ message: 'Sign in first.' });
        return;
    }
    res.json(describe(await freshUser(user)));
};

export const handlePostUpgradeRequest = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = getActorUser(req);
    if (!actor) {
        res.status(401).json({ message: 'Sign in first.' });
        return;
    }
    const user = await freshUser(actor);
    const type = effectiveAccountType(user);
    const allowed = REQUESTABLE[type] ?? [];
    const requested = (req.body ?? {}).account_type;

    if (allowed.length === 0) {
        res.status(403).json({
            message: 'Your account type cannot request an upgrade.',
            code: 'upgrade_not_allowed',
        });
        return;
    }
    if (typeof requested !== 'string' || !allowed.includes(requested)) {
        res.status(400).json({
            message: `Choose one of: ${allowed.join(', ')}.`,
            code: 'invalid_account_type',
        });
        return;
    }

    await stores.user.updateMetadata(user.id, {
        upgrade_request: {
            requested_type: requested,
            requested_at: new Date().toISOString(),
        },
    });
    await stores.user.invalidateById(user.id);
    res.json(describe(await freshUser(user)));
};

export const handleDeleteUpgradeRequest = async (
    req: Request,
    res: Response,
): Promise<void> => {
    const actor = getActorUser(req);
    if (!actor) {
        res.status(401).json({ message: 'Sign in first.' });
        return;
    }
    const user = await freshUser(actor);
    await stores.user.updateMetadata(user.id, { upgrade_request: null });
    await stores.user.invalidateById(user.id);
    res.json(describe(await freshUser(user)));
};

const opts = { subdomain: 'api', requireAuth: true, allowUnconfirmed: true };

extension.get('/account/upgrade-request', opts, handleGetUpgradeRequest);
extension.post('/account/upgrade-request', opts, handlePostUpgradeRequest);
extension.delete('/account/upgrade-request', opts, handleDeleteUpgradeRequest);
