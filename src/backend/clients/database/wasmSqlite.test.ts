import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WasmDatabase, loadSqlJs } from './wasmSqlite';
import { isNativeLoadError, openSqliteDatabase } from './sqliteDriver';

let dir: string;
const opened: { close(): void }[] = [];

beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'mixt-wasm-sqlite-'));
});

afterEach(() => {
    for (const db of opened.splice(0)) {
        try {
            db.close();
        } catch {
            // already closed
        }
    }
    delete process.env.MIXT_SQLITE_DRIVER;
    rmSync(dir, { recursive: true, force: true });
});

const memory = async (): Promise<WasmDatabase> => {
    const db = new WasmDatabase(await loadSqlJs(), ':memory:');
    opened.push(db);
    return db;
};

describe('WasmDatabase', () => {
    it('runs statements and reports changes and the last insert id', async () => {
        const db = await memory();
        db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, name TEXT)');
        const first = db.prepare('INSERT INTO t (name) VALUES (?)').run('a');
        const second = db.prepare('INSERT INTO t (name) VALUES (?)').run('b');
        expect(first.changes).toBe(1);
        expect(second.lastInsertRowid).toBe(2);

        const upd = db.prepare('UPDATE t SET name = ? WHERE id > ?').run('x', 0);
        expect(upd.changes).toBe(2);
    });

    it('returns rows from get and all, and undefined when there are none', async () => {
        const db = await memory();
        db.exec('CREATE TABLE t (id INTEGER, name TEXT, flag INTEGER)');
        db.prepare('INSERT INTO t VALUES (?, ?, ?)').run(1, 'one', true);
        db.prepare('INSERT INTO t VALUES (?, ?, ?)').run(2, null, false);

        expect(db.prepare('SELECT name, flag FROM t WHERE id = ?').get(1)).toEqual({
            name: 'one',
            flag: 1,
        });
        expect(db.prepare('SELECT id FROM t ORDER BY id').all()).toEqual([
            { id: 1 },
            { id: 2 },
        ]);
        expect(db.prepare('SELECT id FROM t WHERE id = ?').get(99)).toBeUndefined();
        expect(db.prepare('SELECT id FROM t WHERE id = ?').all(99)).toEqual([]);
    });

    it('turns undefined parameters into NULL', async () => {
        const db = await memory();
        db.exec('CREATE TABLE t (v TEXT)');
        db.prepare('INSERT INTO t VALUES (?)').run(undefined);
        expect(db.prepare('SELECT v FROM t').get()).toEqual({ v: null });
    });

    it('commits a transaction and rolls it back on error', async () => {
        const db = await memory();
        db.exec('CREATE TABLE t (id INTEGER)');
        const insert = db.transaction((v: number) => {
            db.prepare('INSERT INTO t VALUES (?)').run(v);
        });
        insert(1);
        expect(() =>
            db.transaction(() => {
                db.prepare('INSERT INTO t VALUES (?)').run(2);
                throw new Error('boom');
            })(),
        ).toThrow('boom');
        expect(db.prepare('SELECT id FROM t ORDER BY id').all()).toEqual([{ id: 1 }]);
    });

    it('nests transactions with savepoints, as better-sqlite3 does', async () => {
        const db = await memory();
        db.exec('CREATE TABLE t (id INTEGER)');
        db.transaction(() => {
            db.prepare('INSERT INTO t VALUES (1)').run();
            expect(() =>
                db.transaction(() => {
                    db.prepare('INSERT INTO t VALUES (2)').run();
                    throw new Error('inner');
                })(),
            ).toThrow('inner');
            db.prepare('INSERT INTO t VALUES (3)').run();
        })();
        expect(db.prepare('SELECT id FROM t ORDER BY id').all()).toEqual([
            { id: 1 },
            { id: 3 },
        ]);
    });

    it('enables foreign keys, as better-sqlite3 does', async () => {
        const db = await memory();
        expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
    });

    it('keeps data in a file across close and reopen', async () => {
        const file = path.join(dir, 'mixt.sqlite');
        const first = new WasmDatabase(await loadSqlJs(), file);
        first.exec('CREATE TABLE t (v TEXT)');
        first.prepare('INSERT INTO t VALUES (?)').run('kept');
        first.close();

        const second = new WasmDatabase(await loadSqlJs(), file);
        opened.push(second);
        expect(second.prepare('SELECT v FROM t').all()).toEqual([{ v: 'kept' }]);
    });

    it('writes changes to the file without an explicit close', async () => {
        const file = path.join(dir, 'debounced.sqlite');
        const db = new WasmDatabase(await loadSqlJs(), file);
        opened.push(db);
        db.exec('CREATE TABLE t (v TEXT)');
        db.flush();
        const again = new WasmDatabase(await loadSqlJs(), file);
        opened.push(again);
        expect(again.prepare("SELECT name FROM sqlite_master WHERE name='t'").get()).toEqual({
            name: 't',
        });
    });
});

describe('openSqliteDatabase', () => {
    it('uses the WebAssembly driver when MIXT_SQLITE_DRIVER=wasm', async () => {
        process.env.MIXT_SQLITE_DRIVER = 'wasm';
        const db = await openSqliteDatabase(':memory:');
        opened.push(db);
        db.exec('CREATE TABLE t (v INTEGER)');
        expect(db.prepare('INSERT INTO t VALUES (?)').run(7).changes).toBe(1);
        expect(db.prepare('SELECT v FROM t').get()).toEqual({ v: 7 });
    });

    it('uses the native driver by default when it loads', async () => {
        const db = await openSqliteDatabase(':memory:');
        opened.push(db);
        expect(db.prepare('SELECT 1 AS one').get()).toEqual({ one: 1 });
    });

    it('recognises a native binary that cannot load on this Node version', () => {
        expect(
            isNativeLoadError(
                new Error(
                    'The module was compiled against a different Node.js version using NODE_MODULE_VERSION 108',
                ),
            ),
        ).toBe(true);
        expect(isNativeLoadError(Object.assign(new Error('x'), { code: 'ERR_DLOPEN_FAILED' }))).toBe(true);
    });

    it('does not hide ordinary errors behind the fallback', () => {
        expect(isNativeLoadError(new Error('database disk image is malformed'))).toBe(false);
    });
});
