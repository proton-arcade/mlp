/*
 * Administrator vault: an encrypted, admin-only copy of each account's
 * password, so the administrator can see it on the Administration page.
 *
 * Layout (all inside `<admin_dir>`, which is gitignored):
 *   vault.key          32 random bytes, owner-readable only (created once)
 *   vault/<uuid>.enc   one AES-256-GCM record per account
 *
 * Only the server can decrypt these records. The administrator reads them
 * through the admin overview, which decrypts them when the page loads.
 * Records are written whenever a password is set, changed, or reset.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const KEY_FILE = 'vault.key';
const VAULT_DIR = 'vault';
const ALGO = 'aes-256-gcm';

export interface VaultRecord {
    username: string;
    password: string;
    updated_at: string;
}

const keyPath = (adminDir: string) => path.join(adminDir, KEY_FILE);
const recordPath = (adminDir: string, uuid: string) =>
    path.join(adminDir, VAULT_DIR, `${uuid.replace(/[^a-zA-Z0-9-]/g, '')}.enc`);

/** Loads the vault key, creating it on first use. */
const loadKey = (adminDir: string): Buffer => {
    const file = keyPath(adminDir);
    if (fs.existsSync(file)) {
        const key = Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'base64');
        if (key.length !== 32) throw new Error('admin vault key is corrupt');
        return key;
    }
    fs.mkdirSync(adminDir, { recursive: true });
    const key = crypto.randomBytes(32);
    fs.writeFileSync(file, key.toString('base64') + '\n', { mode: 0o600 });
    return key;
};

const encrypt = (key: Buffer, plain: string): string => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        v: 1,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        data: data.toString('base64'),
    });
};

const decrypt = (key: Buffer, raw: string): string => {
    const env = JSON.parse(raw) as { iv: string; tag: string; data: string };
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(env.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(env.tag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(env.data, 'base64')),
        decipher.final(),
    ]).toString('utf8');
};

/** Stores (or replaces) the encrypted password for one account. */
export const savePassword = (
    adminDir: string,
    uuid: string,
    username: string,
    password: string,
): void => {
    const key = loadKey(adminDir);
    const dir = path.join(adminDir, VAULT_DIR);
    fs.mkdirSync(dir, { recursive: true });
    const record: VaultRecord = {
        username,
        password,
        updated_at: new Date().toISOString(),
    };
    fs.writeFileSync(recordPath(adminDir, uuid), encrypt(key, JSON.stringify(record)), {
        mode: 0o600,
    });
};

/** Reads and decrypts one account's password, or null when none is on file. */
export const readPassword = (adminDir: string, uuid: string): VaultRecord | null => {
    const file = recordPath(adminDir, uuid);
    if (!fs.existsSync(file)) return null;
    const key = loadKey(adminDir);
    return JSON.parse(decrypt(key, fs.readFileSync(file, 'utf8'))) as VaultRecord;
};

/** Removes the stored password for an account (used when it is deleted). */
export const forgetPassword = (adminDir: string, uuid: string): void => {
    fs.rmSync(recordPath(adminDir, uuid), { force: true });
};
