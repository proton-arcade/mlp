/*
 * Picks the SQLite driver for the running Node.js.
 *
 *   - Native better-sqlite3 when its binary loads for this Node version.
 *   - Otherwise the WebAssembly build in ./wasmSqlite (sql.js), which works on
 *     any Node version. Only a missing or ABI-mismatched native binary falls
 *     back. A corrupt database file still fails.
 *
 * MIXT_SQLITE_DRIVER=native | wasm forces one driver (for testing).
 */
import { WasmDatabase, loadSqlJs } from './wasmSqlite';

export interface SqliteStatement {
    run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
}

export interface SqliteDatabase {
    exec(sql: string): void;
    prepare(sql: string): SqliteStatement;
    transaction<T extends (...args: any[]) => any>(fn: T): T;
    close(): void;
}

/** True when an error means "this native binary cannot load on this Node". */
export const isNativeLoadError = (err: unknown): boolean => {
    const e = err as { message?: unknown; code?: unknown } | null;
    const text = `${String(e?.code ?? '')} ${String(e?.message ?? '')}`;
    return /NODE_MODULE_VERSION|ERR_DLOPEN_FAILED|better_sqlite3\.node|Cannot find (module|package)|MODULE_NOT_FOUND|ERR_MODULE_NOT_FOUND/.test(
        text,
    );
};

let warned = false;

export const openSqliteDatabase = async (
    filename: string,
): Promise<SqliteDatabase> => {
    const mode = (process.env.MIXT_SQLITE_DRIVER ?? 'auto').toLowerCase();

    if (mode !== 'wasm') {
        try {
            const Database = (await import('better-sqlite3')).default;
            return new Database(filename) as unknown as SqliteDatabase;
        } catch (err) {
            if (mode === 'native' || !isNativeLoadError(err)) throw err;
            if (!warned) {
                warned = true;
                console.warn(
                    `[sqlite] the native SQLite driver does not load on Node ${process.version} ` +
                        `(${String((err as Error).message).split('\n')[0]}). ` +
                        'Using the built-in WebAssembly driver instead.',
                );
            }
        }
    }

    const SQL = await loadSqlJs();
    return new WasmDatabase(SQL, filename) as unknown as SqliteDatabase;
};
