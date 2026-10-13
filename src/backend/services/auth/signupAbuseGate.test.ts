import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupMixtTestEnv, type MixtTestEnv } from '../../testUtil.js';
import { extensionStore } from '../../extensions.js';

// A hook that could not run is not a hook that approved.
describe('signup abuse hooks fail closed', () => {
    let env: MixtTestEnv;
    beforeAll(async () => {
        env = await setupMixtTestEnv();
    }, 120_000);
    afterAll(async () => {
        delete extensionStore.events['mixt.signup.validate'];
        await env?.shutdown();
    });

    // SKIPPED: anonymous signup; closed by the admin-only lockdown

    it.skip('refuses a signup when the validate hook throws', async () => {
        extensionStore.events['mixt.signup.validate'] = [
            () => {
                throw new Error('harness down');
            },
        ];
        const res = await fetch(new URL('/signup', env.origin), {
            method: 'POST',
            headers: { 'content-type': 'application/json', Origin: env.origin },
            body: JSON.stringify({ is_temp: true }),
        });
        expect(res.status).toBe(403);
    });
});
