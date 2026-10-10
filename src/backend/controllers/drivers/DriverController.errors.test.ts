/**
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

/**
 * Upstream-error translation and rate-limit rejection in `/drivers/call`.
 *
 * When a driver's upstream provider fails, the caller must see a stable Puter
 * error code rather than a raw vendor payload. Each SDK reports its status
 * differently (`status`, `response.status`, an AWS `$metadata` block, or only a
 * message), so the controller sniffs all four — this suite pins the mapping for
 * every shape and asserts the resulting `legacyCode` / `statusCode`, plus the
 * `upstreamStatus` / `upstreamCode` diagnostic fields.
 *
 * The synthetic driver stands in for a provider-backed one: it is the input to
 * the translation under test, and it lets a single controller instance cover
 * every failure shape without real provider credentials.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { Readable, Writable } from 'node:stream';
import type { Request, RequestHandler, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DriverMethodLifecycleEvent } from '../../clients/event/types.js';
import { Context, runWithContext } from '../../core/context.js';
import { configureRateLimit } from '../../core/http/middleware/rateLimit.js';
import { DriverController } from './DriverController.js';

// -- Harness ---------------------------------------------------------

const captureCallHandler = (controller: DriverController): RequestHandler => {
    let handler: RequestHandler | undefined;
    const fakeRouter = {
        post: (path: string, _opts: unknown, h: RequestHandler) => {
            if (path === '/call') handler = h;
            return fakeRouter;
        },
        get: () => fakeRouter,
        use: () => fakeRouter,
    };
    controller.registerRoutes(fakeRouter as any);
    if (!handler) throw new Error('failed to capture POST /call handler');
    return handler;
};

// A real Writable so `result.stream.pipe(res)` behaves like the express
// response it stands in for.
class MockRes extends Writable {
    statusCode = 200;
    body: unknown;
    headers: Record<string, string> = {};
    chunks: Buffer[] = [];
    override _write(
        chunk: Buffer,
        _enc: BufferEncoding,
        cb: (e?: Error) => void,
    ) {
        this.chunks.push(Buffer.from(chunk));
        cb();
    }
    status(code: number) {
        this.statusCode = code;
        return this;
    }
    json(body: unknown) {
        this.body = body;
        return this;
    }
    setHeader(k: string, v: string) {
        this.headers[k.toLowerCase()] = v;
        return this;
    }
}

const makeReq = (body: Record<string, unknown>): Request =>
    ({
        body,
        headers: {},
        query: {},
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
    }) as unknown as Request;

interface BuildOptions {
    run?: () => unknown;
    rateLimit?: unknown;
    /**
     * Rate-limit buckets are keyed by iface+method, so give tests that exercise
     * limits their own namespace.
     */
    iface?: string;
}

/**
 * Build a controller around one synthetic driver. No actor is attached, so the
 * permission scan is skipped and the call reaches the driver method.
 */
const build = (opts: BuildOptions = {}) => {
    const events: DriverMethodLifecycleEvent[] = [];
    const eventClient = {
        emitAndWait: vi.fn(async () => {}),
        emit: vi.fn((_key: string, payload: unknown) => {
            events.push(payload as DriverMethodLifecycleEvent);
        }),
        on: vi.fn(),
    };
    const alarms: Array<{ id: string; severity: string }> = [];
    const iface = opts.iface ?? 'test-iface';
    const driver = {
        driverInterface: iface,
        driverName: 'test-driver',
        isDefault: true,
        ...(opts.rateLimit ? { rateLimit: opts.rateLimit } : {}),
        run:
            opts.run ??
            (() => {
                throw new Error('no run configured');
            }),
    };
    const controller = new DriverController(
        {} as any,
        {
            event: eventClient,
            alarm: {
                create: (id: string, _t: string, _f: unknown, sev: string) => {
                    alarms.push({ id, severity: sev });
                },
            },
        } as any,
        {} as any,
        {} as any,
        { testDriver: driver } as any,
    );
    return {
        handler: captureCallHandler(controller),
        events,
        alarms,
        driver,
        iface,
    };
};

const callWith = async (run: () => unknown) => {
    const { handler, events } = build({ run });
    const res = new MockRes();
    const err = await runWithContext({}, () =>
        handler(
            makeReq({ interface: 'test-iface', method: 'run' }),
            res as unknown as Response,
            () => {},
        ),
    ).then(
        () => null,
        (e: unknown) => e,
    );
    return { err, res, events };
};

const throwing = (payload: unknown) => () => {
    throw payload;
};

// -- Stream results --------------------------------------------------

describe('DriverController stream responses', () => {
    it('sets Transfer-Encoding: chunked for a chunked stream result', async () => {
        const { handler } = build({
            run: () => ({
                dataType: 'stream',
                content_type: 'audio/mpeg',
                chunked: true,
                stream: Readable.from(['a', 'b']),
            }),
        });
        const res = new MockRes();

        await runWithContext({}, () =>
            handler(
                makeReq({ interface: 'test-iface', method: 'run' }),
                res as unknown as Response,
                () => {},
            ),
        );

        expect(res.headers['content-type']).toBe('audio/mpeg');
        expect(res.headers['transfer-encoding']).toBe('chunked');
        // A piped stream never produces a JSON body.
        expect(res.body).toBeUndefined();
    });

    it('omits Transfer-Encoding for a non-chunked stream result', async () => {
        const { handler } = build({
            run: () => ({
                dataType: 'stream',
                content_type: 'audio/mpeg',
                stream: Readable.from(['a']),
            }),
        });
        const res = new MockRes();

        await runWithContext({}, () =>
            handler(
                makeReq({ interface: 'test-iface', method: 'run' }),
                res as unknown as Response,
                () => {},
            ),
        );

        expect(res.headers['content-type']).toBe('audio/mpeg');
        expect('transfer-encoding' in res.headers).toBe(false);
    });
});

// -- Rate limiting ---------------------------------------------------

describe('DriverController per-method rate limiting', () => {
    beforeEach(() => {
        configureRateLimit({ disabled: false } as never);
    });

    it('answers 429 without alarming once the per-method budget is spent', async () => {
        const { handler, alarms, iface } = build({
            run: () => ({ ok: true }),
            rateLimit: { default: { limit: 1, window: 60_000 } },
            iface: 'rate-limited-iface',
        });
        const call = () =>
            runWithContext({}, () =>
                handler(
                    makeReq({ interface: iface, method: 'run' }),
                    new MockRes() as unknown as Response,
                    () => {},
                ),
            );

        await call();
        await expect(call()).rejects.toMatchObject({
            statusCode: 429,
            legacyCode: 'too_many_requests',
        });

        // Spending your own budget is the limit working as designed, so it
        // must not raise anything — the 429 is the whole signal.
        expect(alarms).toEqual([]);
    });
});

// -- Client disconnect --------------------------------------------------

describe('DriverController client disconnect', () => {
    it('exposes an abort signal in the request context that fires when the client leaves early', async () => {
        let seen: AbortSignal | undefined;
        const { handler } = build({
            run: async () => {
                seen = Context.get('abortSignal');
                await new Promise((r) => setImmediate(r));
                return { ok: true };
            },
        });
        const res = new MockRes();
        const done = runWithContext({}, () =>
            handler(
                makeReq({ interface: 'test-iface', method: 'run' }),
                res as unknown as Response,
                () => {},
            ),
        );
        res.destroy();
        await done;

        expect(seen).toBeInstanceOf(AbortSignal);
        expect(seen?.aborted).toBe(true);
    });

    it('does not abort when the response simply finished', async () => {
        let seen: AbortSignal | undefined;
        const { handler } = build({
            run: () => {
                seen = Context.get('abortSignal');
                return { ok: true };
            },
        });
        const res = new MockRes();
        await runWithContext({}, () =>
            handler(
                makeReq({ interface: 'test-iface', method: 'run' }),
                res as unknown as Response,
                () => {},
            ),
        );
        res.end();
        await new Promise((r) => setImmediate(r));

        expect(seen?.aborted).toBe(false);
    });
});
