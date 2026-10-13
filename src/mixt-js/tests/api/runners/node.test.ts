import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    setupMixtTestEnv,
    type MixtTestEnv,
} from '@mixt/backend/testUtil.ts';
import type { IConfig } from '@mixt/backend/types.ts';
import { loadMixtJsTestOptions } from '../harness/capabilities.ts';
import { coverageEnabled, writeCoverageShard } from '../harness/coverage.ts';
import { listTests, runTest, skipReason } from '../harness/executor.ts';
import {
    closeNodeMixt,
    collectNodeCoverage,
    loadNodeMixt,
} from '../harness/nodeSdkLoader.ts';
import type { EnvManifest } from '../harness/types.ts';

const options = loadMixtJsTestOptions();

// The shared mixt.js suites running under node.js: the built SDK bundle
// is loaded into a vm context (like `src/init.cjs`) against an in-memory
// server on a real port.
describe('mixt.js API suites (node)', () => {
    let env: MixtTestEnv;
    let manifest: EnvManifest;

    beforeAll(async () => {
        env = await setupMixtTestEnv(options.configOverrides as IConfig);
        manifest = {
            origin: env.origin,
            apiOrigin: env.apiOrigin,
            users: env.users,
            capabilities: options.capabilities,
        };
    }, 120_000);

    afterAll(async () => {
        if (coverageEnabled()) {
            await writeCoverageShard('node', collectNodeCoverage());
        }
        await env?.shutdown();
    });

    for (const test of listTests()) {
        const skip = skipReason(test, 'node', options.capabilities);
        it.skipIf(skip)(`${test.suiteName} > ${test.testName}`, async () => {
            const mixt = loadNodeMixt(manifest, manifest.users.user.token);
            const result = await runTest(
                {
                    suiteName: test.suiteName,
                    testName: test.testName,
                    env: manifest,
                    platform: 'node',
                },
                mixt,
            ).finally(() => closeNodeMixt(mixt));
            expect(result.error ?? '').toBe('');
            expect(result.ok).toBe(true);
        });
    }
});
