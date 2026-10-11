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

import './util/nodeCompat';
import { installOfflineNetworkGuard } from './util/offlineNetwork';

// Mixt is fully local: refuse outbound connections to non-local addresses.
installOfflineNetworkGuard();
import { isSpanContextValid, trace } from '@opentelemetry/api';
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { mixtClients } from './clients';
import { loadConfig } from './config';
import { mixtControllers } from './controllers';
import { mixtDrivers } from './drivers';
import { MixtServer } from './server';
import { mixtServices } from './services';
import { mixtStores } from './stores';
import { createGracefulShutdown } from './util/gracefulShutdown.js';
import { installJsonConsole } from './util/jsonConsole.js';

// How long a node with a server identity keeps serving in-flight work after
// it stops accepting connections.
const GRACEFUL_DRAIN_MS = 90_000;

// Node's happy-eyeballs default (250 ms) abandons a slow IPv4 handshake and
// falls through to IPv6; on hosts with no IPv6 route, one dropped SYN fails
// the whole connect. 2 s outlasts a single SYN retransmit.
const CONNECT_ATTEMPT_TIMEOUT_MS = 2_000;

// if called directly, start the server
if (require.main === module) {
    setDefaultAutoSelectFamilyAttemptTimeout(CONNECT_ATTEMPT_TIMEOUT_MS);

    const config = loadConfig();

    // Structured logging: when `log_format: "json"`, replace the global console
    // so each call emits one JSON line (level, timestamp, msg, and the active
    // trace id) — one event per call, so a line-oriented log collector can't
    // split stack traces across events. Installed here rather than in the OTel
    // preload so it applies even when telemetry is disabled; the trace id is
    // simply absent when no span is active.
    if (config.log_format === 'json') {
        installJsonConsole({
            getTraceContext: () => {
                const ctx = trace.getActiveSpan()?.spanContext();
                if (!ctx || !isSpanContextValid(ctx)) return undefined;
                return { traceId: ctx.traceId, spanId: ctx.spanId };
            },
        });
    }

    const server = new MixtServer(
        config,
        mixtClients,
        mixtStores,
        mixtServices,
        mixtControllers,
        mixtDrivers,
    );
    server.start();
    // Owns process exit on signals; the telemetry preload installs none and is
    // flushed as the last shutdown step.
    const shutDownProcess = createGracefulShutdown(server, {
        // SIGINT (Ctrl-C) always exits immediately, even with a serverId: a
        // 90s wait on a local dev interrupt would make it look hung.
        drainMs: (signal) =>
            signal === 'SIGTERM' && config.serverId ? GRACEFUL_DRAIN_MS : 0,
    });
    // `on`, not `once`: a repeat signal must hit the in-progress guard instead
    // of falling through to Node's default immediate exit.
    process.on('SIGINT', () => void shutDownProcess('SIGINT'));
    process.on('SIGTERM', () => void shutDownProcess('SIGTERM'));
    // Uncaught exceptions and unhandled rejections are reported by the guards
    // `MixtServer.start()` installs — see util/processGuards.ts.
}
