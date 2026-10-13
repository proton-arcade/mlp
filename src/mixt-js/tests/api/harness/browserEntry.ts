import { runTest, type RunTestArgs } from './executor.ts';
import type { MixtSDK, RunTestResult } from './types.ts';

/**
 * Browser-side entry, esbuild-bundled into the fixture page by the browser
 * runner. The page loads the real SDK bundle from the test server
 * (`/mixt.js/v2`) with `window.MIXT_API_ORIGIN` pre-set, so `window.mixt`
 * is already pointed at the right origin; each call authenticates it as the
 * regular test user and runs one named suite test.
 */
declare global {
    interface Window {
        mixt: MixtSDK;
        __runSuiteTest__: (args: RunTestArgs) => Promise<RunTestResult>;
    }
}

window.__runSuiteTest__ = async (args) => {
    const mixt = window.mixt;
    if (!mixt) {
        return { ok: false, error: 'window.mixt is not loaded' };
    }
    mixt.setAuthToken(args.env.users.user.token);
    return runTest(args, mixt);
};
