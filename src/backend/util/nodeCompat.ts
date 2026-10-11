/*
 * Compatibility shims so the backend also runs on Node 18.
 *
 * Mixt targets Node 24. These shims fill in APIs that Node 18 lacks, and they
 * do nothing on newer runtimes:
 *
 *   - `File` global: Node 20+ provides it; undici ships a compatible class.
 *   - `node:sqlite`: Node 22.5+ provides it. The local S3/SQS emulator
 *     (fauxqs) imports it at load time. On older runtimes a module-loader hook
 *     maps `node:sqlite` onto better-sqlite3, which the backend already uses
 *     and which exposes the same DatabaseSync-style API.
 *
 * This module must be the first import of the backend entry point.
 */
import { createRequire, register } from 'node:module';
import { File as UndiciFile } from 'undici';

const g = globalThis as Record<string, unknown>;
if (typeof g.File === 'undefined') {
    g.File = UndiciFile;
}

const [major, minor] = process.versions.node.split('.').map(Number);
const hasNodeSqlite = major > 22 || (major === 22 && minor >= 5);

if (!hasNodeSqlite) {
    const betterSqlitePath = createRequire(__filename).resolve('better-sqlite3');
    const shimSource = [
        'import { createRequire } from "node:module";',
        `const require = createRequire(${JSON.stringify(__filename)});`,
        `export const DatabaseSync = require(${JSON.stringify(betterSqlitePath)});`,
    ].join('\n');
    const hooks = `
export async function resolve(specifier, context, next) {
    if (specifier === 'node:sqlite') return { url: 'node-sqlite-shim:', shortCircuit: true };
    return next(specifier, context);
}
export async function load(url, context, next) {
    if (url === 'node-sqlite-shim:') return { format: 'module', source: ${JSON.stringify(shimSource)}, shortCircuit: true };
    return next(url, context);
}`;
    register(`data:text/javascript,${encodeURIComponent(hooks)}`);
}
