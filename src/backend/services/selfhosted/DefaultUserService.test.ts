import bcrypt from 'bcrypt';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MixtServer } from '../../server.ts';
import { setupTestServer } from '../../testUtil.ts';
import { ADMIN_PASSWORD_FILE } from './DefaultUserService.ts';

let server: MixtServer;
let adminDir: string;
const adminFile = () => path.join(adminDir, ADMIN_PASSWORD_FILE);
const filePassword = (): string =>
    JSON.parse(readFileSync(adminFile(), 'utf8')).password;

beforeAll(async () => {
    adminDir = mkdtempSync(path.join(tmpdir(), 'mixt-admin-'));
    server = await setupTestServer({
        no_default_user: false,
        admin_dir: adminDir,
    } as never);
});

afterAll(async () => {
    await server?.shutdown();
    rmSync(adminDir, { recursive: true, force: true });
});

describe('DefaultUserService — administrator password file', () => {
    it('creates admin.json and sets the admin account to its password', async () => {
        const password = filePassword();
        expect(password.length).toBeGreaterThanOrEqual(8);

        const admin = await server.stores.user.getByUsername('admin');
        expect(admin).toBeTruthy();
        expect(await bcrypt.compare(password, String(admin?.password))).toBe(
            true,
        );
    });

    it('does not keep the plaintext password in the account metadata', async () => {
        const admin = await server.stores.user.getByUsername('admin');
        expect(admin?.metadata?.tmp_password ?? null).toBeNull();
    });

    it('applies a changed password from the file on the next start', async () => {
        writeFileSync(
            adminFile(),
            JSON.stringify({ password: 'a-new-admin-password' }),
        );

        // Simulate the next boot.
        await server.services.defaultUser.onServerStart();

        const admin = await server.stores.user.getByUsername('admin');
        expect(
            await bcrypt.compare('a-new-admin-password', String(admin?.password)),
        ).toBe(true);
    });

    it('keeps the account when the file already matches', async () => {
        const before = await server.stores.user.getByUsername('admin');
        await server.services.defaultUser.onServerStart();
        const after = await server.stores.user.getByUsername('admin');
        expect(after?.password).toBe(before?.password);
    });

    it('creates a new random password when the file is missing', async () => {
        rmSync(adminFile());
        await server.services.defaultUser.onServerStart();

        const password = filePassword();
        const admin = await server.stores.user.getByUsername('admin');
        expect(await bcrypt.compare(password, String(admin?.password))).toBe(
            true,
        );
    });
});
