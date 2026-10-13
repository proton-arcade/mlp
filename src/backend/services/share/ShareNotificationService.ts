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

import type { Actor } from '../../core/actor';
import { checkRateLimit } from '../../core/http/middleware/rateLimit.js';
import { MixtService } from '../types';
import {
    mergeShareSender,
    shareNotifyCount,
    shareNotifyTitle,
    shareSendersFromFields,
    type ShareSender,
} from './shareNotifyTitle';
import {
    maskedSharePath,
    ownerFromSharePath,
    shareDeepLink,
} from './shareDeepLink';
import { NOTIFY_FANOUT_CAP } from '../../stores/team/TeamStore';
import { blocksAllShares, type ResolvedShare } from './ShareService';

/**
 * How long one sharer stays quiet after reaching a recipient, and how long a
 * recipient's notification keeps absorbing new shares.
 */
export const SHARE_NOTIFY_WINDOW_SECONDS = 15 * 60;

/** Times one sharer may interrupt the same recipient in a day. */
export const SHARE_NOTIFY_PAIR_DAILY_LIMIT = 20;

/** Times a recipient may be interrupted per hour, whoever it is from. */
export const SHARE_NOTIFY_RECIPIENT_HOURLY_LIMIT = 10;

/** Same, over a day. */
export const SHARE_NOTIFY_RECIPIENT_DAILY_LIMIT = 50;

/** How far back to look for the notification a new share folds into. */
const OPEN_NOTIFICATION_SCAN = 20;

const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;

/** Notifications this service folds shares into. */
const SHARE_TYPE = 'share.received';

/**
 * The `template` marker `SHARE_TYPE` rows carried before the type registry.
 * Still matched when looking for an open group, so a notification written by
 * the previous release still absorbs today's shares.
 */
const LEGACY_SHARE_TEMPLATE = 'file-shared-with-you';

/** A budget: a key, how many are allowed, and over what window. */
type Budget = [key: string, limit: number, windowMs: number];

/** Where a single-item notification points; a masked path, opened in place. */
interface ShareNotificationTarget {
    path: string;
    name: string;
}

/**
 * Tells people what was shared with them, off the response path. What the
 * notification says is always kept current; whether it may interrupt them
 * (push) is budgeted.
 */
export class ShareNotificationService extends MixtService {

    /**
     * Announce a batch of shares, one notification per recipient — five items
     * for one person is one notification, not five. Never throws: a share that
     * landed must not be reported as failed because the announcement wasn't.
     *
     * Only shares that created new reach count; a mode change is not worth
     * interrupting anyone for.
     */
        async notifyShared(actor: Actor, shares: ResolvedShare[]): Promise<void> {
        const issuerId = actor.user?.id;
        const issuer = actor.user?.username;
        if (typeof issuerId !== 'number') return;

        const counts = new Map<number, number>();
        const targets = new Map<number, ShareNotificationTarget | null>();
        // A team share has no holder of its own, so it is expanded here.
        for (const { holderId, share } of await this.#recipientsOf(
            shares,
            issuerId,
        )) {
            counts.set(holderId, (counts.get(holderId) ?? 0) + 1);
            // Only a lone item is worth pointing at; a second nulls it.
            const path = this.#targetPath(share);
            targets.set(
                holderId,
                targets.has(holderId) || !path
                    ? null
                    : { path, name: share.name as string },
            );
        }

        // Each recipient fails alone: one failure must not cost the next
        // person their notification. Failures are logged, never thrown.
        await Promise.allSettled(
            [...counts].map(async ([holderId, count]) => {
                try {
                    const interrupt = await this.#claimInterruption(
                        issuerId,
                        holderId,
                    );
                    await this.#announce(
                        holderId,
                        issuer,
                        count,
                        interrupt,
                        targets.get(holderId) ?? null,
                    );
                } catch (err) {
                    console.warn(
                        '[share-notify] could not announce to user',
                        holderId,
                        err,
                    );
                }
            }),
        );
    }

    /**
     * Who each share announces to. A user share is its own holder; a team share
     * is every live member except the issuer, expanded at announcement time so
     * the grant stays one row and only the telling fans out.
     *
     * A member who joins later resolves the grant through the scan but is never
     * told: access follows the team, announcements describe a moment.
     */
    async #recipientsOf(
        shares: ResolvedShare[],
        issuerId: number,
    ): Promise<Array<{ holderId: number; share: ResolvedShare }>> {
        const out: Array<{ holderId: number; share: ResolvedShare }> = [];
        const byGroup = new Map<number, number[]>();
        const allowedByGroup = new Map<number, number[]>();
        for (const share of shares) {
            if (share.pending || !share.isNew) continue;

            if (share.holderId) {
                if (share.holderId === issuerId) continue;
                out.push({ holderId: share.holderId, share });
                continue;
            }
            if (!share.holderGroupId) continue;

            // Cached per group: N items shared with one team is one read.
            let members = byGroup.get(share.holderGroupId);
            if (!members) {
                try {
                    members = await this.stores.team.listMemberIdsByGroupId(
                        share.holderGroupId,
                    );
                } catch (err) {
                    // Silence is this path's failure mode, so say so out loud.
                    console.warn(
                        '[share-notify] could not expand team',
                        share.holderGroupId,
                        err,
                    );
                    continue;
                }
                byGroup.set(share.holderGroupId, members);
            }
            // The store reads one past the cap, so `>` means it really did
            // truncate; exactly the cap did not.
            if (members.length > NOTIFY_FANOUT_CAP) {
                members = members.slice(0, NOTIFY_FANOUT_CAP);
                byGroup.set(share.holderGroupId, members);
                console.warn(
                    '[share-notify] team fan-out hit the cap; some members were not told',
                    { groupId: share.holderGroupId, cap: NOTIFY_FANOUT_CAP },
                );
            }
            // A block refuses contact, and this is the contact: the group grant
            // is one row so it cannot exclude a member, but the telling can.
            // Cached with the member list -- block state is per pair, not per item.
            let allowed = allowedByGroup.get(share.holderGroupId);
            if (!allowed) {
                allowed = await this.#unblocked(members, issuerId);
                allowedByGroup.set(share.holderGroupId, allowed);
            }
            for (const holderId of allowed) {
                if (holderId === issuerId) continue;
                out.push({ holderId, share });
            }
        }
        return out;
    }

    /** Members who have not refused shares from this issuer. */
    async #unblocked(members: number[], issuerId: number): Promise<number[]> {
        const kept = await Promise.all(
            members.map(async (id) => {
                try {
                    const user = await this.stores.user.getById(id);
                    if (blocksAllShares(user)) return null;
                    return (await this.stores.userBlock.isBlocked(id, issuerId))
                        ? null
                        : id;
                } catch (err) {
                    // Failing open would announce to someone who refused it.
                    console.warn('[share-notify] block check failed', id, err);
                    return null;
                }
            }),
        );
        return kept.filter((id): id is number => id !== null);
    }

    /**
     * Fold this batch into the notification the recipient hasn't dealt with, or
     * start one. Written either way — a suppressed interruption must not lose
     * the share — so `interrupt` gates only the push.
     */
    async #announce(
        holderId: number,
        issuer: string | undefined,
        count: number,
        interrupt: boolean,
        target: ShareNotificationTarget | null,
    ): Promise<void> {
        const silent = !interrupt;
        const open = await this.#openShareNotification(holderId);

        if (open) {
            // Folding means the group now covers more than one item, so no
            // single target describes it — the click goes to Shared instead.
            const folded = this.#payload(
                issuer,
                mergeShareSender(open.senders, issuer, count),
                open.groupUntil,
                null,
            );
            if (
                await this.services.notification.notifyUpdate(
                    open.uid,
                    holderId,
                    folded,
                    { type: SHARE_TYPE, silent },
                )
            ) {
                return;
            }
            // Dismissed between the read and the write — fall through and start
            // a fresh group rather than reviving what they just cleared.
        }

        await this.services.notification.notify(
            [holderId],
            this.#payload(
                issuer,
                mergeShareSender([], issuer, count),
                Date.now() + this.#limits().pairWindowSeconds * 1000,
                count === 1 ? target : null,
            ),
            { type: SHARE_TYPE, silent },
        );
    }

    /**
     * `groupUntil` is when this notification stops absorbing shares. Carried on
     * the payload rather than derived from `created_at`, whose type differs per
     * dialect, and kept as the group grows so a busy hour still closes it on
     * schedule.
     */
    #payload(
        issuer: string | undefined,
        senders: ShareSender[],
        groupUntil: number,
        target: ShareNotificationTarget | null,
    ): Record<string, unknown> {
        return {
            title: shareNotifyTitle(senders),
            // `username` and `count` are the pre-grouping shape, kept for
            // anything still reading it; `senders` is what the title is from.
            fields: {
                username: issuer,
                count: shareNotifyCount(senders),
                senders,
                groupUntil,
                // A masked path, not a URL: the GUI opens it in place.
                ...(target ? { target } : {}),
            },
        };
    }

    /** The share notification still open for more, if there is one. */
    async #openShareNotification(holderId: number): Promise<{
        uid: string;
        senders: ShareSender[];
        groupUntil: number;
    } | null> {
        const rows = await this.stores.notification.listByUserId(holderId, {
            filter: 'unacknowledged',
            limit: OPEN_NOTIFICATION_SCAN,
        });

        for (const row of rows) {
            const value = (row?.value ?? {}) as {
                template?: unknown;
                fields?: { groupUntil?: unknown };
            };
            const isOpenShare =
                row?.type === SHARE_TYPE ||
                value.template === LEGACY_SHARE_TEMPLATE;
            if (!isOpenShare || !row?.uid) continue;

            // Newest first, so the first share notification is the only
            // candidate: if its group has closed, every older one's has too.
            const groupUntil = Number(value.fields?.groupUntil);
            if (!Number.isFinite(groupUntil) || groupUntil <= Date.now()) {
                return null;
            }
            return {
                uid: String(row.uid),
                senders: shareSendersFromFields(value.fields),
                groupUntil,
            };
        }
        return null;
    }

    /**
     * Whether this share may interrupt the recipient at all. The pair budget
     * stops one person nagging; the recipient budget bounds the total noise.
     * Fails open — one notification too many beats going silent.
     *
     * Order matters because `checkRateLimit` records on allow with no refund:
     * budgets after the refusing one stay unspent. The pair window leads (it
     * refuses most, and its token self-expires in minutes); pair-day goes last
     * so a saturated recipient can't burn a sender's day-scale budget.
     */
    async #claimInterruption(
        issuerId: number,
        holderId: number,
    ): Promise<boolean> {
        const limits = this.#limits();
        return this.#withinBudget([
            [
                `share:notify:pair:${issuerId}:${holderId}`,
                1,
                limits.pairWindowSeconds * 1000,
            ],
            [`share:notify:to:${holderId}`, limits.recipientHourly, HOUR_MS],
            [`share:notify:to-day:${holderId}`, limits.recipientDaily, DAY_MS],
            [
                `share:notify:pair-day:${issuerId}:${holderId}`,
                limits.pairDaily,
                DAY_MS,
            ],
        ]);
    }

    /** All bounds hold. A non-positive limit removes its bound, as elsewhere. */
    async #withinBudget(budgets: Budget[]): Promise<boolean> {
        for (const [key, limit, windowMs] of budgets) {
            if (limit <= 0) continue;
            if (!(await checkRateLimit(key, limit, windowMs))) return false;
        }
        return true;
    }

    #limits(): {
        pairWindowSeconds: number;
        pairDaily: number;
        recipientHourly: number;
        recipientDaily: number;
    } {
        const configured = this.config.share_notify_limits ?? {};
        return {
            pairWindowSeconds:
                configured.pairWindowSeconds ?? SHARE_NOTIFY_WINDOW_SECONDS,
            pairDaily: configured.pairDaily ?? SHARE_NOTIFY_PAIR_DAILY_LIMIT,
            recipientHourly:
                configured.recipientHourly ??
                SHARE_NOTIFY_RECIPIENT_HOURLY_LIMIT,
            recipientDaily:
                configured.recipientDaily ?? SHARE_NOTIFY_RECIPIENT_DAILY_LIMIT,
        };
    }

    /** The masked path for a share, or `null` when it isn't addressable. */
    #targetPath(share: ResolvedShare): string | null {
        if (!share.name) return null;
        const ownerUsername =
            share.owner?.username ?? ownerFromSharePath(share.path);
        if (!ownerUsername) return null;
        return maskedSharePath({
            name: share.name,
            uid: share.entryUid,
            ownerUsername,
        });
    }
}
