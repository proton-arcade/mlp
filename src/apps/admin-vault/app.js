/*
 * Admin Vault (browser side). Records are sealed by the server with the public
 * key. This page decrypts them with the private key, which lives in this
 * device's IndexedDB as a non-extractable CryptoKey, or in a passphrase-
 * protected key file the admin imports.
 */
(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const api = (window.mixt && mixt.APIOrigin) || location.origin.replace('//', '//api.');
    const token = (window.mixt && mixt.authToken) || localStorage.getItem('auth_token_v2') || '';
    const PBKDF2_ITERATIONS = 600000;
    const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' };

    let privateKey = null;   // CryptoKey, unlocked on this device
    let keyId = null;        // the vault key this device holds

    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

    function say (text, bad) {
        const el = $('msg');
        el.textContent = text || '';
        el.className = 'msg ' + (text ? (bad ? 'bad' : 'good') : '');
    }

    async function call (path, body) {
        const init = { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' };
        if ( body ) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        }
        const resp = await fetch(`${api}${path}`, init);
        const data = await resp.json().catch(() => ({}));
        if ( ! resp.ok ) {
            const err = new Error(data.error || data.message || `HTTP ${resp.status}`);
            err.status = resp.status;
            throw err;
        }
        return data;
    }

    // ---- base64 helpers ----
    const b64 = (buf) => {
        let s = '';
        const bytes = new Uint8Array(buf);
        for ( let i = 0; i < bytes.length; i++ ) s += String.fromCharCode(bytes[i]);
        return btoa(s);
    };
    const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

    async function fingerprint (spkiBytes) {
        const digest = await crypto.subtle.digest('SHA-256', spkiBytes);
        return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    }

    // ---- local key storage (IndexedDB) ----
    function openDb () {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('mixt-admin-vault', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('keys');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }
    async function storeKey (record) {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction('keys', 'readwrite');
            tx.objectStore('keys').put(record, 'private');
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    }
    async function loadKey () {
        const db = await openDb();
        const record = await new Promise((resolve, reject) => {
            const req = db.transaction('keys').objectStore('keys').get('private');
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return record;
    }
    async function clearKey () {
        const db = await openDb();
        await new Promise((resolve) => {
            const tx = db.transaction('keys', 'readwrite');
            tx.objectStore('keys').delete('private');
            tx.oncomplete = resolve;
        });
        db.close();
    }

    // ---- passphrase-protected key file ----
    async function deriveWrapKey (passphrase, salt) {
        const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
            base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
        );
    }

    async function makeKeyFile (pkcs8, spki, passphrase, id) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const wrap = await deriveWrapKey(passphrase, salt);
        const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrap, pkcs8);
        return {
            format: 'mixt-admin-vault-key',
            version: 1,
            key_id: id,
            public_key_spki: b64(spki),
            kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: PBKDF2_ITERATIONS, salt: b64(salt) },
            iv: b64(iv),
            private_key_enc: b64(data),
        };
    }

    async function readKeyFile (file, passphrase) {
        const doc = JSON.parse(await file.text());
        if ( doc.format !== 'mixt-admin-vault-key' || doc.version !== 1 ) {
            throw new Error('This is not an admin vault key file');
        }
        const wrap = await deriveWrapKey(passphrase, unb64(doc.kdf.salt));
        let pkcs8;
        try {
            pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(doc.iv) }, wrap, unb64(doc.private_key_enc));
        } catch (_) {
            throw new Error('Wrong passphrase, or the key file is damaged');
        }
        // Stored non-extractable: the private key cannot be exported from this page.
        const key = await crypto.subtle.importKey('pkcs8', pkcs8, RSA, false, ['decrypt']);
        return { key, keyId: doc.key_id, spki: unb64(doc.public_key_spki) };
    }

    // ---- views ----
    function show (id, on) { $(id).classList.toggle('hidden', !on); }

    function showOnly (panel) {
        for ( const id of ['setup', 'import', 'records-wrap', 'list-wrap', 'reset-wrap'] ) {
            show(id, id === panel);
        }
        if ( panel === 'records-wrap' ) show('list-wrap', true);
        if ( panel === 'records-wrap' ) show('reset-wrap', true);
        show('lock', !!privateKey);
    }

    async function decryptRecord (r) {
        const aesRaw = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, unb64(r.wrapped_key));
        const aes = await crypto.subtle.importKey('raw', aesRaw, { name: 'AES-GCM' }, false, ['decrypt']);
        const text = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(r.iv) }, aes, unb64(r.sealed));
        return dec.decode(text);
    }

    async function renderRecords () {
        const records = await call('/vault/records');
        const host = $('records');
        if ( ! records.length ) {
            host.innerHTML = '<p class="hint">No records yet.</p>';
            return;
        }
        host.innerHTML = '';
        for ( const r of records ) {
            const row = document.createElement('div');
            row.className = 'record';
            row.innerHTML = `
                <div class="label">${esc(r.label)}</div>
                <div class="meta">${new Date(r.created_at).toLocaleString()}</div>
                <div class="row" style="margin-top:6px">
                    <button class="btn" type="button" data-act="show">Show</button>
                    <button class="btn danger" type="button" data-act="delete">Delete</button>
                </div>`;
            row.querySelector('[data-act="show"]').addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const pre = row.querySelector('pre');
                if ( pre ) { pre.remove(); btn.textContent = 'Show'; return; }
                try {
                    const text = await decryptRecord(r);
                    const p = document.createElement('pre');
                    p.textContent = text;
                    row.appendChild(p);
                    btn.textContent = 'Hide';
                } catch (err) {
                    say('Could not decrypt this record with the key on this device: ' + err.message, true);
                }
            });
            row.querySelector('[data-act="delete"]').addEventListener('click', async () => {
                if ( ! confirm(`Delete "${r.label}"?`) ) return;
                await call('/vault/records/delete', { id: r.id });
                await renderRecords();
            });
            host.appendChild(row);
        }
    }

    async function unlocked () {
        showOnly('records-wrap');
        await renderRecords();
        $('state').textContent = `Unlocked · key ${keyId}`;
    }

    async function start () {
        let status;
        try {
            status = await call('/vault/status');
        } catch (err) {
            if ( err.status === 403 ) { show('denied', true); return; }
            say(err.message, true);
            return;
        }
        if ( ! status.configured ) {
            $('state').textContent = 'Not set up';
            showOnly('setup');
            return;
        }
        const local = await loadKey();
        if ( local && local.keyId === status.key_id ) {
            privateKey = local.key;
            keyId = local.keyId;
            await unlocked();
            return;
        }
        $('state').textContent = 'Locked on this device';
        showOnly('import');
    }

    $('setup-go').addEventListener('click', async () => {
        const pass = $('setup-pass').value;
        if ( pass.length < 12 ) return say('The passphrase must be at least 12 characters.', true);
        if ( pass !== $('setup-pass2').value ) return say('The two passphrases do not match.', true);
        $('setup-go').disabled = true;
        try {
            const pair = await crypto.subtle.generateKey(
                { name: 'RSA-OAEP', modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
                true, ['encrypt', 'decrypt'],
            );
            const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
            const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
            const id = await fingerprint(spki);
            const file = await makeKeyFile(pkcs8, spki, pass, id);
            // Save the file first: once the server has the public key, the file is the only copy.
            const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mixt-admin-vault.key.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 10000);
            await call('/vault/setup', { public_key_spki: b64(spki) });
            const nonExtractable = await crypto.subtle.importKey('pkcs8', pkcs8, RSA, false, ['decrypt']);
            await storeKey({ keyId: id, key: nonExtractable });
            privateKey = nonExtractable;
            keyId = id;
            $('setup-pass').value = '';
            $('setup-pass2').value = '';
            say('Vault set up. Keep the downloaded key file somewhere safe.');
            await unlocked();
        } catch (err) {
            say(err.message, true);
        } finally {
            $('setup-go').disabled = false;
        }
    });

    $('import-go').addEventListener('click', async () => {
        const file = $('import-file').files[0];
        if ( ! file ) return say('Choose the key file first.', true);
        try {
            const status = await call('/vault/status');
            const { key, keyId: id, spki } = await readKeyFile(file, $('import-pass').value);
            const computed = await fingerprint(spki);
            if ( computed !== id || id !== status.key_id ) {
                return say('This key file does not belong to this vault.', true);
            }
            await storeKey({ keyId: id, key });
            privateKey = key;
            keyId = id;
            $('import-pass').value = '';
            say('Unlocked. This device will open the vault automatically from now on.');
            await unlocked();
        } catch (err) {
            say(err.message, true);
        }
    });

    $('rec-add').addEventListener('click', async () => {
        const label = $('rec-label').value.trim();
        const text = $('rec-text').value;
        try {
            await call('/vault/records', { label, text });
            $('rec-label').value = '';
            $('rec-text').value = '';
            say('Saved and encrypted.');
            await renderRecords();
        } catch (err) {
            say(err.message, true);
        }
    });

    $('lock').addEventListener('click', () => {
        privateKey = null;
        keyId = null;
        $('state').textContent = 'Locked';
        showOnly('import');
        say('Locked. Import the key file to unlock again.');
    });

    $('reset-go').addEventListener('click', async () => {
        try {
            await call('/vault/reset', { confirm: $('reset-confirm').value });
            await clearKey();
            privateKey = null;
            keyId = null;
            $('reset-confirm').value = '';
            say('Vault reset. Set up a new key.');
            await start();
        } catch (err) {
            say(err.message, true);
        }
    });

    start().catch((err) => say(err.message, true));
})();
