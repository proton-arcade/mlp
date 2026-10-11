/*
 * Compatibility shims so the backend also runs on Node 18.
 *
 * Mixt targets Node 24. These shims fill in APIs that Node 18 lacks, and they
 * do nothing on Node 22.5+:
 *
 *   - `File` global: Node 20+ provides it; undici ships a compatible class.
 *   - SQLite driver: Node 18 needs better-sqlite3 12.x (13.x segfaults there,
 *     12.x crashes on Node 24). Both are installed; on Node below 22.5 every
 *     `require('better-sqlite3')` is redirected to the 12.x alias. If its binary
 *     does not load (another Node ABI), SqliteDatabaseClient uses the built-in
 *     WebAssembly driver (clients/database/sqliteDriver).
 *   - `node:sqlite`: Node 22.5+ provides it. The local S3/SQS emulator
 *     (fauxqs) imports it at load time. On older runtimes a module-loader hook
 *     maps `node:sqlite` onto the same better-sqlite3 build.
 *
 * This module must be the first import of the backend entry point.
 */
import { createRequire, register } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { File as UndiciFile } from 'undici';

const g = globalThis as Record<string, unknown>;
if (typeof g.File === 'undefined') {
    g.File = UndiciFile;
}

const [major, minor] = process.versions.node.split('.').map(Number);
const hasNodeSqlite = major > 22 || (major === 22 && minor >= 5);

if (!hasNodeSqlite) {
    const requireHere = createRequire(__filename);
    const sqliteOld = requireHere.resolve('better-sqlite3-node18');

    // Redirect `require('better-sqlite3')` to the 12.x alias for CJS callers.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Module = require('node:module') as {
        _resolveFilename: (request: string, ...rest: unknown[]) => string;
    };
    const originalResolve = Module._resolveFilename;
    Module._resolveFilename = function (request: string, ...rest: unknown[]) {
        if (request === 'better-sqlite3') {
            return originalResolve.call(this, sqliteOld, ...rest);
        }
        return originalResolve.call(this, request, ...rest);
    };

    // Same redirect for ESM importers such as fauxqs' persistence module.
    // The S3/SQS emulator's DatabaseSync uses the WebAssembly driver, which
    // loads on every Node version, not the native binary, which is tied to one
    // module ABI.
    const wasmDriverUrl = pathToFileURL(
        path.join(__dirname, '../clients/database/wasmSqlite.js'),
    ).href;
    const shimSource = [
        `const { loadDatabaseSync } = await import(${JSON.stringify(wasmDriverUrl)});`,
        'export const DatabaseSync = await loadDatabaseSync();',
    ].join('\n');
    // The backend's `await import('better-sqlite3')` is a native dynamic import
    // (ESM loader), so the ESM hook must redirect it as well.
    const sqliteOldUrl = pathToFileURL(sqliteOld).href;
    const hooks = `
import { pathToFileURL } from "node:url";
export async function resolve(specifier, context, next) {
    if (specifier === 'node:sqlite') return { url: 'node-sqlite-shim:', shortCircuit: true };
    if (specifier === 'better-sqlite3') return { url: ${JSON.stringify(sqliteOldUrl)}, shortCircuit: true };
    return next(specifier, context);
}
export async function load(url, context, next) {
    if (url === 'node-sqlite-shim:') return { format: 'module', source: ${JSON.stringify(shimSource)}, shortCircuit: true };
    return next(url, context);
}`;
    register(`data:text/javascript,${encodeURIComponent(hooks)}`);
}
