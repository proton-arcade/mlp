/*
 * Tiny IndexedDB helper for the built-in apps that keep data on this device
 * (Notes, Calendar). Each app passes its own database name and store list.
 */
(function () {
    'use strict';

    function open (name, stores) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(name, 1);
            req.onupgradeneeded = () => {
                for ( const s of stores ) {
                    if ( !req.result.objectStoreNames.contains(s) ) {
                        req.result.createObjectStore(s, { keyPath: 'id' });
                    }
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    function run (db, store, mode, fn) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(store, mode);
            const out = fn(tx.objectStore(store));
            tx.oncomplete = () => resolve(out && out.result !== undefined ? out.result : undefined);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    window.LocalDB = function (name, stores) {
        let dbPromise = null;
        const db = () => (dbPromise ||= open(name, stores));
        return {
            async all (store) {
                const d = await db();
                return new Promise((resolve, reject) => {
                    const req = d.transaction(store).objectStore(store).getAll();
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                });
            },
            async put (store, value) {
                const d = await db();
                await run(d, store, 'readwrite', (s) => s.put(value));
                return value;
            },
            async remove (store, id) {
                const d = await db();
                await run(d, store, 'readwrite', (s) => s.delete(id));
            },
        };
    };
})();
