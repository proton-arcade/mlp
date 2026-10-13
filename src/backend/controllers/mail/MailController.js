/*
 * Mail: chat-style messages between accounts on this server, plus each
 * account's contacts. There is no external mail: an address is always
 * `<username>@mixt.mpl`, and a message can only go to an existing account.
 */

import { HttpError } from '../../core/http/HttpError.js';
import { MixtController } from '../types.js';

const DOMAIN = 'mixt.mpl';
const MAX_BODY = 5000;
const MAX_LIST = 200;
const API_LIMIT = { scope: 'mail', limit: 600, window: 60_000, key: 'user' };

const clean = (v, max) => String(v ?? '').trim().slice(0, max);

/** `alice`, `alice@mixt.mpl` -> `alice`. Anything else is rejected. */
function parseUsername (raw) {
    const value = clean(raw, 120).toLowerCase();
    const local = value.endsWith(`@${DOMAIN}`) ? value.slice(0, -(DOMAIN.length + 1)) : value;
    if ( ! /^[a-z0-9._-]{1,50}$/.test(local) ) {
        throw new HttpError(400, 'Enter a valid address like name@mixt.mpl', { legacyCode: 'bad_address' });
    }
    return local;
}

export class MailController extends MixtController {
    get db () {
        return this.clients.db;
    }

    async registerRoutes (router) {
        const requireUser = { subdomain: 'api', requireUserActor: true, allowFullAccessToken: true, rateLimit: API_LIMIT };

        // The signed-in account's own address.
        router.get('/mail/me', requireUser, async (req, res) => {
            const me = req.actor.user;
            res.json({ address: `${me.username}@${DOMAIN}`, username: me.username, domain: DOMAIN });
        });

        // Conversations, newest first. One entry per other account.
        router.get('/mail/threads', requireUser, async (req, res) => {
            const meId = req.actor.user.id;
            const rows = await this.db.read(
                `SELECT m.thread_key, m.body, m.created_at, m.from_user_id, m.to_user_id, m.read_at
                 FROM mail_messages m
                 INNER JOIN (
                    SELECT thread_key, MAX(id) AS last_id FROM mail_messages
                    WHERE from_user_id = ? OR to_user_id = ? GROUP BY thread_key
                 ) last ON last.last_id = m.id
                 ORDER BY m.created_at DESC LIMIT ?`,
                [meId, meId, MAX_LIST],
            );
            const threads = [];
            for ( const row of rows ) {
                const otherId = row.from_user_id === meId ? row.to_user_id : row.from_user_id;
                const other = await this.db.read('SELECT `username` FROM `user` WHERE `id` = ? LIMIT 1', [otherId]);
                const username = other[0]?.username;
                if ( ! username ) continue;
                const unread = await this.db.read(
                    'SELECT COUNT(*) AS n FROM mail_messages WHERE thread_key = ? AND to_user_id = ? AND read_at IS NULL',
                    [row.thread_key, meId],
                );
                threads.push({
                    with: username,
                    address: `${username}@${DOMAIN}`,
                    last: row.body.slice(0, 140),
                    last_at: Number(row.created_at),
                    last_from_me: row.from_user_id === meId,
                    unread: Number(unread[0]?.n ?? 0),
                });
            }
            res.json(threads);
        });

        // Messages in one conversation, oldest first.
        router.get('/mail/thread', requireUser, async (req, res) => {
            const meId = req.actor.user.id;
            const other = await this.resolveUser(parseUsername(req.query?.with));
            const key = threadKey(meId, other.id);
            const rows = await this.db.read(
                'SELECT id, from_user_id, body, created_at FROM mail_messages WHERE thread_key = ? ORDER BY id ASC LIMIT ?',
                [key, 500],
            );
            res.json({
                with: other.username,
                address: `${other.username}@${DOMAIN}`,
                messages: rows.map((r) => ({
                    id: Number(r.id),
                    mine: r.from_user_id === meId,
                    body: r.body,
                    created_at: Number(r.created_at),
                })),
            });
        });

        // Send a message. `to` is a username or a full @mixt.mpl address.
        router.post('/mail/send', requireUser, async (req, res) => {
            const me = req.actor.user;
            const body = clean(req.body?.body, MAX_BODY + 1);
            if ( ! body ) throw new HttpError(400, 'Write a message first', { legacyCode: 'empty_message' });
            if ( body.length > MAX_BODY ) throw new HttpError(400, `Messages are limited to ${MAX_BODY} characters`, { legacyCode: 'message_too_long' });
            const to = await this.resolveUser(parseUsername(req.body?.to));
            const now = Date.now();
            await this.db.write(
                'INSERT INTO mail_messages (from_user_id, to_user_id, thread_key, body, created_at) VALUES (?, ?, ?, ?, ?)',
                [me.id, to.id, threadKey(me.id, to.id), body, now],
            );
            res.json({ ok: true, to: `${to.username}@${DOMAIN}`, created_at: now });
        });

        // Mark everything the other account sent in this conversation as read.
        router.post('/mail/read', requireUser, async (req, res) => {
            const meId = req.actor.user.id;
            const other = await this.resolveUser(parseUsername(req.body?.with));
            await this.db.write(
                'UPDATE mail_messages SET read_at = ? WHERE thread_key = ? AND to_user_id = ? AND read_at IS NULL',
                [Date.now(), threadKey(meId, other.id), meId],
            );
            res.json({ ok: true });
        });

        // Contacts belong to one account and are never shared.
        router.get('/mail/contacts', requireUser, async (req, res) => {
            const rows = await this.db.read(
                'SELECT id, name, address, phone, note FROM mail_contacts WHERE owner_user_id = ? ORDER BY LOWER(name) ASC LIMIT ?',
                [req.actor.user.id, MAX_LIST],
            );
            res.json(rows.map((r) => ({ id: Number(r.id), name: r.name, address: r.address ? `${r.address}@${DOMAIN}` : '', phone: r.phone ?? '', note: r.note ?? '' })));
        });

        // Create (no id) or update (with id) one of the account's contacts.
        router.post('/mail/contacts', requireUser, async (req, res) => {
            const owner = req.actor.user.id;
            const name = clean(req.body?.name, 200);
            if ( ! name ) throw new HttpError(400, 'A contact needs a name', { legacyCode: 'name_required' });
            const address = req.body?.address ? parseUsername(req.body.address) : '';
            const phone = clean(req.body?.phone, 60);
            const note = clean(req.body?.note, 2000);
            const now = Date.now();
            const id = Number(req.body?.id);
            if ( Number.isInteger(id) && id > 0 ) {
                const result = await this.db.write(
                    'UPDATE mail_contacts SET name = ?, address = ?, phone = ?, note = ?, updated_at = ? WHERE id = ? AND owner_user_id = ?',
                    [name, address || null, phone || null, note || null, now, id, owner],
                );
                if ( ! result.anyRowsAffected ) throw new HttpError(404, 'Contact not found', { legacyCode: 'not_found' });
                res.json({ ok: true, id });
                return;
            }
            const result = await this.db.write(
                'INSERT INTO mail_contacts (owner_user_id, name, address, phone, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [owner, name, address || null, phone || null, note || null, now, now],
            );
            res.json({ ok: true, id: Number(result.insertId) });
        });

        router.post('/mail/contacts/delete', requireUser, async (req, res) => {
            const id = Number(req.body?.id);
            if ( ! Number.isInteger(id) || id <= 0 ) throw new HttpError(400, 'Bad contact id', { legacyCode: 'bad_id' });
            await this.db.write('DELETE FROM mail_contacts WHERE id = ? AND owner_user_id = ?', [id, req.actor.user.id]);
            res.json({ ok: true });
        });
    }

    async resolveUser (username) {
        const rows = await this.db.read('SELECT `id`, `username` FROM `user` WHERE LOWER(`username`) = ? LIMIT 1', [username]);
        if ( ! rows[0] ) throw new HttpError(404, `No account named ${username}@${DOMAIN}`, { legacyCode: 'no_such_account' });
        return { id: rows[0].id, username: rows[0].username };
    }
}

function threadKey (a, b) {
    return a < b ? `${a}:${b}` : `${b}:${a}`;
}
