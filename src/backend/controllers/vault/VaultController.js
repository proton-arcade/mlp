/*
 * Admin vault. The server encrypts records with the admin's PUBLIC key and
 * never holds the private key, so it cannot read what it stores. The admin's
 * device decrypts in the browser with the private key from its key file.
 *
 * Sealing (server): a fresh AES-256-GCM key per record encrypts the text;
 * RSA-OAEP (SHA-256) wraps that AES key with the public key.
 */

import crypto from 'node:crypto';
import { HttpError } from '../../core/http/HttpError.js';
import { MixtController } from '../types.js';
import { ADMIN_USERNAME } from '../../util/adminOnlyApps.js';

const ADMIN_LIMIT = { scope: 'vault', limit: 300, window: 60_000, key: 'user' };
const MAX_LABEL = 200;
const MAX_TEXT = 20_000;

function requireAdmin(req) {
    if (req.actor?.user?.username !== ADMIN_USERNAME) {
        throw new HttpError(403, 'Only the administrator can use the vault', {
            legacyCode: 'forbidden',
        });
    }
}

function publicKeyFrom(spkiB64) {
    const der = Buffer.from(spkiB64, 'base64');
    const key = crypto.createPublicKey({
        key: der,
        format: 'der',
        type: 'spki',
    });
    if (key.asymmetricKeyType !== 'rsa') {
        throw new HttpError(400, 'The vault needs an RSA public key', {
            legacyCode: 'bad_key',
        });
    }
    return { key, der };
}

function seal(plaintext, publicKey) {
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    const body = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const sealed = Buffer.concat([body, cipher.getAuthTag()]);
    const wrapped = crypto.publicEncrypt(
        {
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256',
        },
        aesKey,
    );
    return {
        wrapped_key: wrapped.toString('base64'),
        iv: iv.toString('base64'),
        sealed: sealed.toString('base64'),
    };
}

export class VaultController extends MixtController {
    get db() {
        return this.clients.db;
    }

    async currentKey() {
        const rows = await this.db.read(
            'SELECT `public_key_spki`, `key_id` FROM `vault_keys` WHERE `id` = 1',
        );
        return rows[0] ?? null;
    }

    registerRoutes(router) {
        const adminRoute = {
            subdomain: 'api',
            requireUserActor: true,
            allowFullAccessToken: true,
            rateLimit: ADMIN_LIMIT,
        };

        router.get('/vault/status', adminRoute, async (req, res) => {
            requireAdmin(req);
            const key = await this.currentKey();
            const count = await this.db.read(
                'SELECT COUNT(*) AS n FROM `vault_records`',
            );
            res.json({
                configured: !!key,
                key_id: key?.key_id ?? null,
                public_key_spki: key?.public_key_spki ?? null,
                records: Number(count[0]?.n ?? 0),
            });
        });

        // First-time setup: the browser generated the pair and sends only the public half.
        router.post('/vault/setup', adminRoute, async (req, res) => {
            requireAdmin(req);
            if (await this.currentKey()) {
                throw new HttpError(
                    409,
                    'The vault is already set up. Reset it first to make a new key.',
                    { legacyCode: 'already_set_up' },
                );
            }
            const spki = String(req.body?.public_key_spki ?? '');
            const { der } = publicKeyFrom(spki);
            const keyId = crypto
                .createHash('sha256')
                .update(der)
                .digest('hex')
                .slice(0, 16);
            await this.db.write(
                'INSERT INTO `vault_keys` (`id`, `public_key_spki`, `key_id`, `created_at`) VALUES (1, ?, ?, ?)',
                [spki, keyId, Date.now()],
            );
            res.json({ ok: true, key_id: keyId });
        });

        router.get('/vault/records', adminRoute, async (req, res) => {
            requireAdmin(req);
            const rows = await this.db.read(
                'SELECT `id`, `label`, `wrapped_key`, `iv`, `sealed`, `created_at` FROM `vault_records` ORDER BY `id` DESC LIMIT 500',
            );
            res.json(
                rows.map((r) => ({
                    id: Number(r.id),
                    label: r.label,
                    wrapped_key: r.wrapped_key,
                    iv: r.iv,
                    sealed: r.sealed,
                    created_at: Number(r.created_at),
                })),
            );
        });

        router.post('/vault/records', adminRoute, async (req, res) => {
            requireAdmin(req);
            const key = await this.currentKey();
            if (!key)
                throw new HttpError(409, 'Set up the vault first', {
                    legacyCode: 'not_set_up',
                });
            const label = String(req.body?.label ?? '')
                .trim()
                .slice(0, MAX_LABEL);
            const text = String(req.body?.text ?? '');
            if (!label)
                throw new HttpError(400, 'Give the record a label', {
                    legacyCode: 'label_required',
                });
            if (!text)
                throw new HttpError(400, 'The record is empty', {
                    legacyCode: 'empty',
                });
            if (text.length > MAX_TEXT)
                throw new HttpError(
                    400,
                    `Records are limited to ${MAX_TEXT} characters`,
                    { legacyCode: 'too_long' },
                );
            const { key: publicKey } = publicKeyFrom(key.public_key_spki);
            const box = seal(text, publicKey);
            const result = await this.db.write(
                'INSERT INTO `vault_records` (`label`, `wrapped_key`, `iv`, `sealed`, `created_at`) VALUES (?, ?, ?, ?, ?)',
                [label, box.wrapped_key, box.iv, box.sealed, Date.now()],
            );
            res.json({ ok: true, id: Number(result.insertId) });
        });

        router.post('/vault/records/delete', adminRoute, async (req, res) => {
            requireAdmin(req);
            const id = Number(req.body?.id);
            if (!Number.isInteger(id) || id <= 0)
                throw new HttpError(400, 'Bad record id', {
                    legacyCode: 'bad_id',
                });
            await this.db.write('DELETE FROM `vault_records` WHERE `id` = ?', [
                id,
            ]);
            res.json({ ok: true });
        });

        // Destroys every record and the public key. Any device still holding the
        // old key file can no longer read anything, and a new key must be made.
        router.post('/vault/reset', adminRoute, async (req, res) => {
            requireAdmin(req);
            if (req.body?.confirm !== 'RESET') {
                throw new HttpError(400, 'Type RESET to confirm', {
                    legacyCode: 'not_confirmed',
                });
            }
            await this.db.write('DELETE FROM `vault_records`');
            await this.db.write('DELETE FROM `vault_keys`');
            res.json({ ok: true });
        });
    }
}
