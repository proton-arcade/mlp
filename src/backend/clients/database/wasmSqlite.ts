/*
 * SQLite without a native module, for Node versions whose native SQLite
 * binary cannot load (for example a Node build with a different module ABI).
 *
 * This is sql.js (SQLite compiled to WebAssembly). It runs on every Node
 * version, needs no compiler, and is vendored in vendor/node-modules. It is
 * slower than the native driver and keeps the database in memory, so the file
 * is written back after each change (debounced to ~100 ms) and on exit.
 *
 * It implements the subset of the better-sqlite3 / node:sqlite API that Mixt
 * uses: exec, prepare().run/get/all, transaction (with savepoints for nesting),
 * and close.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const req = createRequire(__filename);

type SqlJsStatement = {
    bind(values?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
};
type SqlJsRawDatabase = {
    exec(sql: string): { columns: string[]; values: unknown[][] }[];
    prepare(sql: string): SqlJsStatement;
    getRowsModified(): number;
    export(): Uint8Array;
    close(): void;
};
export type SqlJsModule = {
    Database: new (data?: Uint8Array | null) => SqlJsRawDatabase;
};

let sqlJsPromise: Promise<SqlJsModule> | null = null;

/** Loads sql.js once. The WebAssembly binary is read from the vendored package. */
export const loadSqlJs = (): Promise<SqlJsModule> => {
    sqlJsPromise ??= (async () => {
        const init = req('sql.js') as (config: {
            wasmBinary: Uint8Array;
        }) => Promise<SqlJsModule>;
        const wasmPath = path.join(
            path.dirname(req.resolve('sql.js')),
            'sql-wasm.wasm',
        );
        return init({ wasmBinary: fs.readFileSync(wasmPath) });
    })();
    return sqlJsPromise;
};

/** Converts a JS value to one sql.js can bind. */
const toSqlValue = (value: unknown): unknown => {
    if (value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'bigint') return Number(value);
    if (Buffer.isBuffer(value)) return new Uint8Array(value);
    return value;
};

const openDatabases = new Set<WasmDatabase>();

const flushAll = (): void => {
    for (const db of openDatabases) db.flush();
};
process.once('exit', flushAll);

class WasmStatement {
    constructor(
        private readonly owner: WasmDatabase,
        private readonly sql: string,
    ) {}

    private bindAndRun(params: unknown[], collect: 'none' | 'first' | 'all') {
        const raw = this.owner.raw;
        const stmt = raw.prepare(this.sql);
        try {
            stmt.bind(params.map(toSqlValue));
            if (collect === 'none') {
                stmt.step();
                return undefined;
            }
            if (collect === 'first') {
                return stmt.step() ? stmt.getAsObject() : undefined;
            }
            const rows: Record<string, unknown>[] = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            return rows;
        } finally {
            stmt.free();
        }
    }

    run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
        this.bindAndRun(params, 'none');
        this.owner.markChanged();
        const raw = this.owner.raw;
        const changes = raw.getRowsModified();
        const idRows = raw.exec('SELECT last_insert_rowid()');
        const lastInsertRowid = Number(idRows[0]?.values[0]?.[0] ?? 0);
        return { changes, lastInsertRowid };
    }

    get(...params: unknown[]): unknown {
        return this.bindAndRun(params, 'first');
    }

    all(...params: unknown[]): unknown[] {
        return this.bindAndRun(params, 'all') as unknown[];
    }
}

export class WasmDatabase {
    readonly raw: SqlJsRawDatabase;
    private readonly file: string | null;
    private dirty = false;
    private timer: NodeJS.Timeout | null = null;
    private savepointDepth = 0;

    constructor(SQL: SqlJsModule, filename: string) {
        this.file = filename === ':memory:' || filename === '' ? null : filename;
        const existing =
            this.file && fs.existsSync(this.file)
                ? new Uint8Array(fs.readFileSync(this.file))
                : null;
        this.raw = existing ? new SQL.Database(existing) : new SQL.Database();
        // better-sqlite3 enables foreign keys by default; keep the same behaviour.
        this.raw.exec('PRAGMA foreign_keys = ON');
        if (this.file) openDatabases.add(this);
    }

    exec(sql: string): void {
        this.raw.exec(sql);
        this.markChanged();
    }

    prepare(sql: string): WasmStatement {
        return new WasmStatement(this, sql);
    }

    /**
     * Runs `fn` in a transaction. A nested call uses a savepoint, as
     * better-sqlite3 does, instead of failing with "already in a transaction".
     */
    transaction<T extends (...args: any[]) => any>(fn: T): T {
        const wrapped = (...args: unknown[]) => {
            const depth = this.savepointDepth++;
            const name = `mixt_sp_${depth}`;
            this.raw.exec(depth === 0 ? 'BEGIN' : `SAVEPOINT ${name}`);
            try {
                const result = fn(...args);
                this.raw.exec(depth === 0 ? 'COMMIT' : `RELEASE ${name}`);
                this.markChanged();
                return result;
            } catch (err) {
                try {
                    this.raw.exec(
                        depth === 0
                            ? 'ROLLBACK'
                            : `ROLLBACK TO ${name}; RELEASE ${name}`,
                    );
                } catch {
                    // The transaction is already gone; rethrow the original error.
                }
                throw err;
            } finally {
                this.savepointDepth--;
            }
        };
        return wrapped as unknown as T;
    }

    /** Marks the database as changed and schedules a write to disk. */
    markChanged(): void {
        if (!this.file) return;
        this.dirty = true;
        if (this.timer) return;
        this.timer = setTimeout(() => {
            this.timer = null;
            this.flush();
        }, 100);
        this.timer.unref?.();
    }

    /** Writes the database to its file if it changed. Atomic: temp file, then rename. */
    flush(): void {
        if (!this.file || !this.dirty) return;
        const tmp = `${this.file}.tmp`;
        fs.writeFileSync(tmp, this.raw.export());
        fs.renameSync(tmp, this.file);
        this.dirty = false;
    }

    close(): void {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        this.flush();
        this.raw.close();
        openDatabases.delete(this);
    }
}

/**
 * A DatabaseSync-compatible class (node:sqlite's name), so code that imports
 * `DatabaseSync` on Node below 22.5 gets this driver instead.
 */
export const loadDatabaseSync = async (): Promise<
    new (filename: string, options?: unknown) => WasmDatabase
> => {
    const SQL = await loadSqlJs();
    return class DatabaseSync {
        constructor(filename: string) {
            return new WasmDatabase(SQL, filename) as unknown as DatabaseSync;
        }
    } as unknown as new (filename: string, options?: unknown) => WasmDatabase;
};
