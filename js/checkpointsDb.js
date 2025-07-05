// Plik: js/checkpointsDb.js
// Cel: Zarządza bazą danych IndexedDB dla punktów kontrolnych.

import { dbAction } from './db.js';

let checkpointsDb;
const DB_NAME = 'StrongmanCheckpointsDB';
const STORE_NAME = 'checkpoints';

export function initCheckpointsDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        
        request.onerror = function(event) {
            console.error(`Błąd bazy danych ${DB_NAME}:`, event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            checkpointsDb = event.target.result;
            resolve();
        };
        
        request.onupgradeneeded = function(event) {
            let db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

export async function saveCheckpointDB(key, data) {
    const record = { key, ...data };
    return await dbAction(checkpointsDb, STORE_NAME, 'readwrite', (store, r) => store.put(r), record);
}

export async function getCheckpointsDB() {
    const checkpoints = await dbAction(checkpointsDb, STORE_NAME, 'readonly', store => store.getAll());
    return checkpoints.sort((a, b) => b.key.localeCompare(a.key));
}

export async function deleteCheckpointDB(key) {
    return await dbAction(checkpointsDb, STORE_NAME, 'readwrite', (store, k) => store.delete(k), key);
}

export async function clearAllCheckpointsDB() {
    return await dbAction(checkpointsDb, STORE_NAME, 'readwrite', store => store.clear());
}
