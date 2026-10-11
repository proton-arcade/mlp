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

import { HttpError } from '../../core/http/HttpError.js';
import { MixtService } from '../types.js';

/**
 * User-to-developer app feedback ("send feedback to this app's developer").
 *
 * Feedback is gated per app by the `apps.feedback_enabled` column — off unless
 * enabled. The Dev Center enables it when it creates an app (its "User
 * Feedback" settings toggle turns it off); apps created through
 * `mixt.apps.create`/`update` default to off and opt in via `feedbackEnabled`
 * in mixt.js. Submissions are stored in `app_feedback`. Nothing is sent to
 * the app owner: external email is removed, and the stored rows have no other
 * read path, so `acceptsFeedback` reports the feature as unavailable.
 *
 * Trust model: the submit endpoint only accepts user actors (never app tokens),
 * so an app cannot submit feedback programmatically — every message passes
 * through the GUI dialog (desktop) or the mixt.mpl popup (external sites),
 * i.e. through a page the user actually typed into. App identity is likewise
 * never taken from the app: the desktop resolves it from its own process
 * registry, and the popup resolves it from the browser-attested opener origin
 * via AuthService.appUidFromOrigin.
 *
 * Abuse posture, layered:
 *
 * 1. Route rate limits (controller) — cheap first line, but the limiter fails open
 *    when its backend is down.
 * 2. Durable DB-count caps (here) — per (user, app) and per user per day. These
 *    read the `app_feedback` table itself, so they hold across restarts and
 *    nodes, and fail closed with the insert.
 */
export class AppFeedbackService extends MixtService {
    /** Max feedback message length, in characters (after normalization). */
    static readonly MESSAGE_MAX_LENGTH = 4000;
    /** Max feedback rows one user may create for one app per day. */
    static readonly PER_USER_APP_DAILY_LIMIT = 3;
    /** Max feedback rows one user may create across all apps per day. */
    static readonly PER_USER_DAILY_LIMIT = 10;

    /**
     * Normalize a raw feedback message: unify newlines, strip control
     * characters (except newline and tab), and trim. Returns the normalized
     * string, or null when nothing usable remains.
     */
    normalizeMessage(raw: unknown): string | null {
        if (typeof raw !== 'string') return null;
        const normalized = raw
            .replace(/\r\n?/g, '\n')
            // Strip C0 control chars (keeping \t and \n) and DEL.

            .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
            .trim();
        return normalized.length > 0 ? normalized : null;
    }

    /**
     * Resolve the target app for a feedback interaction. Exactly one of `app`
     * (uid or name) / `origin` (external site origin, resolved through the same
     * path token acquisition uses) must be provided.
     *
     * Returns the app row or null when no such app exists. Throws 400 on an
     * unparseable origin. A blocked origin resolves to null rather than
     * throwing — to a feedback caller "blocked" and "unknown" mean the same
     * thing: nobody is accepting feedback there.
     */
    async resolveTargetApp({
        app,
        origin,
    }: {
        app?: string;
        origin?: string;
    }): Promise<Record<string, unknown> | null> {
        if (app) {
            // Names may legally start with "app-" (e.g. "app-center"), so a
            // prefix heuristic would misroute them; try uid first, then name.
            return await this.stores.app.resolveApp(app);
        }
        if (origin) {
            let uid;
            try {
                uid = await this.services.auth.appUidFromOrigin(origin);
            } catch (e) {
                if (e instanceof HttpError && e.legacyCode === 'app_blocked') {
                    return null;
                }
                throw e;
            }
            return await this.stores.app.getByUid(uid);
        }
        return null;
    }

    /**
     * Whether `app` (a row from AppStore) currently accepts user feedback.
     * Feedback used to be delivered to the developer by email. External email
     * is removed from this deployment, and the stored rows have no read path,
     * so the feature reports itself unavailable instead of storing messages
     * nobody can read.
     */
    acceptsFeedback(_app: Record<string, unknown> | null): boolean {
        return false;
    }

    /**
     * Pre-flight for the feedback dialog: does this target accept feedback, and
     * what should the dialog display? `app` fields are limited to what the
     * dialog needs — `name` is included because it's unique and
     * format-restricted, so the dialog can show it under the free-form title as
     * an anti-impersonation measure.
     */
    async getTarget(params: { app?: string; origin?: string }): Promise<{
        enabled: boolean;
        app: { name: string; title: string } | null;
    }> {
        const app = await this.resolveTargetApp(params);
        return {
            enabled: this.acceptsFeedback(app),
            app: app
                ? { name: String(app.name), title: String(app.title) }
                : null,
        };
    }

    /**
     * Store one feedback message.
     * Caller (controller) has already authenticated the user and validated the
     * message's type and raw length; this method owns the business rules.
     *
     * @returns The stored row's public uid.
     */
    async submit({
        userId,
        app,
        origin,
        message,
        sourceEnv,
        sourceOrigin,
    }: {
        userId: number;
        app?: string;
        origin?: string;
        message: string;
        sourceEnv?: 'app' | 'web';
        sourceOrigin?: string | null;
    }): Promise<{ uid: string }> {
        const targetApp = await this.resolveTargetApp({ app, origin });
        if (!this.acceptsFeedback(targetApp)) {
            throw new HttpError(
                403,
                'This app is not accepting feedback right now',
                { legacyCode: 'feedback_not_enabled' },
            );
        }
        const appId = Number(targetApp!.id);
        const appUid = String(targetApp!.uid);

        const normalized = this.normalizeMessage(message);
        if (!normalized) {
            throw new HttpError(400, '`message` must not be empty', {
                legacyCode: 'bad_request',
            });
        }
        if (normalized.length > AppFeedbackService.MESSAGE_MAX_LENGTH) {
            throw new HttpError(
                400,
                `\`message\` is too long (max ${AppFeedbackService.MESSAGE_MAX_LENGTH} characters)`,
                { legacyCode: 'bad_request' },
            );
        }

        // Durable caps. Deliberately DB-backed (see class doc); the counts
        // ride the (user_id, created_at) / (app_id, created_at) indexes.
        // `includeOwnRow` distinguishes the pre-insert check (this
        // submission not yet counted) from the post-insert recount (it is).
        const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
        const capsBreached = async (
            includeOwnRow: boolean,
        ): Promise<boolean> => {
            const slack = includeOwnRow ? 1 : 0;
            const [userAppCount, userCount] = await Promise.all([
                this.stores.appFeedback.countByUserAndAppSince(
                    userId,
                    appId,
                    since,
                ),
                this.stores.appFeedback.countByUserSince(userId, since),
            ]);
            return (
                userAppCount >=
                    AppFeedbackService.PER_USER_APP_DAILY_LIMIT + slack ||
                userCount >= AppFeedbackService.PER_USER_DAILY_LIMIT + slack
            );
        };
        const tooManyError = new HttpError(
            429,
            'You have sent a lot of feedback recently — please try again later',
            { legacyCode: 'too_many_requests' },
        );
        if (await capsBreached(false)) {
            throw tooManyError;
        }

        const row = await this.stores.appFeedback.create({
            appId,
            appUid,
            userId,
            message: normalized,
            sourceEnv: sourceEnv ?? null,
            sourceOrigin: sourceOrigin ?? null,
        });

        // The pre-check is check-then-insert, so parallel submissions (or
        // multiple nodes) can all pass it on the same stale count. Recount
        // with this row included and roll it back if a concurrent burst
        // pushed past a cap — these caps must fail closed, not just usually
        // hold.
        if (await capsBreached(true)) {
            await this.stores.appFeedback.deleteById(row.id);
            throw tooManyError;
        }

        return { uid: row.uid };
    }
}
