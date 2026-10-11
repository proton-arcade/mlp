import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIXT_ORIGIN = process.env.MIXT_TEST_ORIGIN || 'http://localhost:4100';
const FIXTURE_ORIGIN = process.env.MIXT_TEST_FIXTURE_ORIGIN || 'http://localhost:8080';
const RECORD_ALL = !!process.env.MIXT_TEST_RECORD;
const STORAGE_STATE_PATH = path.join(__dirname, 'tests', 'e2e', '.auth', 'state.json');

export default defineConfig({
    testDir: './tests/e2e/specs',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: 'list',
    timeout: 120_000,
    expect: { timeout: 15_000 },
    globalSetup: './tests/e2e/globalSetup.js',
    use: {
        baseURL: MIXT_ORIGIN,
        storageState: STORAGE_STATE_PATH,
        trace: 'retain-on-failure',
        video: RECORD_ALL ? 'on' : 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chromium',
            use: { ...devices['iPhone 13'] },
        },
    ],
    metadata: {
        mixtOrigin: MIXT_ORIGIN,
        fixtureOrigin: FIXTURE_ORIGIN,
    },
});
