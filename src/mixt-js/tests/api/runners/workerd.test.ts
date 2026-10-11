import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    setupMixtTestEnv,
    type MixtTestEnv,
} from '@mixt/backend/testUtil.ts';
import type { IConfig } from '@mixt/backend/types.ts';
import { bundleHarnessEntry } from '../harness/bundleHarnessEntry.ts';
import { loadMixtJsTestOptions } from '../harness/capabilities.ts';
import {
    coverageEnabled,
    writeCoverageShard,
    type IstanbulCoverage,
} from '../harness/coverage.ts';
import { listTests, skipReason, type RunTestArgs } from '../harness/executor.ts';
import { loadNodeMixt } from '../harness/nodeSdkLoader.ts';
import type { EnvManifest, RunTestResult } from '../harness/types.ts';

const WORKER_NAME = 'mixtjs-suites';

const options = loadMixtJsTestOptions();

// Counters ride along on every /run response (the workerd isolate can
// recycle mid-run); merged into one shard after the run.
const workerdCoverage: IstanbulCoverage[] = [];

// The shared mixt.js suites running inside local workerd. The suite
// bundle is deployed through the real workers pipeline (SDK
// `workers.create` → WorkerDriver → LocalWorkerService), and each test is
// dispatched over HTTP through the local worker proxy at
// `<name>.workers.localhost`, exactly like a production Mixt worker.
describe('mixt.js API suites (workerd)', () => {
    let env: MixtTestEnv;
    let manifest: EnvManifest;
    let workerUrl: string;

    beforeAll(async () => {
        // `loadMixtJsTestOptions` routes worker deploys to the local
        // workerd (anything truthy without ACCOUNTID does).
        env = await setupMixtTestEnv(options.configOverrides as IConfig);
        manifest = {
            origin: env.origin,
            apiOrigin: env.apiOrigin,
            users: env.users,
            capabilities: options.capabilities,
        };

        const bundle = await bundleHarnessEntry(
            new URL('../harness/workerdEntry.ts', import.meta.url),
        );

        // Deploy through the SDK as the regular user — same flow as a real
        // `mixt.workers.create` from an app.
        const mixt = loadNodeMixt(manifest, manifest.users.user.token);
        const sourcePath = `/${manifest.users.user.username}/suite-worker.js`;
        await mixt.fs.write(sourcePath, bundle);
        await mixt.workers.create(WORKER_NAME, sourcePath);

        const port = new URL(env.apiOrigin).port;
        workerUrl = `http://${WORKER_NAME}.workers.localhost:${port}/run`;
    }, 120_000);

    afterAll(async () => {
        if (coverageEnabled()) {
            await writeCoverageShard('workerd', workerdCoverage);
        }
        await env?.shutdown();
    });

    for (const test of listTests()) {
        const skip = skipReason(test, 'workerd', options.capabilities);
        it.skipIf(skip)(`${test.suiteName} > ${test.testName}`, async () => {
            const args: RunTestArgs = {
                suiteName: test.suiteName,
                testName: test.testName,
                env: manifest,
                platform: 'workerd',
            };
            const res = await fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'mixt-auth': manifest.users.user.token,
                },
                body: JSON.stringify(args),
            });
            const text = await res.text();
            if (res.status !== 200) {
                throw new Error(`worker returned ${res.status}: ${text}`);
            }
            const result = JSON.parse(text) as RunTestResult;
            if (result.coverage) {
                workerdCoverage.push(result.coverage);
            }
            expect(result.error ?? '').toBe('');
            expect(result.ok).toBe(true);
        });
    }
});
