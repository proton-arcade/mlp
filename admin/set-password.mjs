#!/usr/bin/env node
// Set the administrator password.
//
//   node admin/set-password.mjs <new password>
//   node admin/set-password.mjs            (generates a random password)
//
// It writes admin/admin.json. Restart the server afterwards: on start the
// `admin` account is set to the password in that file.

import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(dir, 'admin.json');
const MIN_LENGTH = 8;

const given = process.argv.slice(2).join(' ').trim();
const password = given || randomBytes(16).toString('hex');

if (password.length < MIN_LENGTH) {
    console.error(`The password must be at least ${MIN_LENGTH} characters.`);
    process.exit(1);
}

mkdirSync(dir, { recursive: true });
writeFileSync(file, JSON.stringify({ password }, null, 4) + '\n', { mode: 0o600 });

console.log(`Wrote ${file}`);
if (!given) console.log(`Generated password: ${password}`);
console.log('Restart the server to apply it.');
