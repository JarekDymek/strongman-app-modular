// Plik: js/database.js
// Cel: Centralny moduł zarządzania całą bazą danych IndexedDB aplikacji.

import { showNotification } from './ui.js';
import { INITIAL_COMPETITORS, INITIAL_EVENTS } from './initialData.js';

let db;
const DB_NAME = 'StrongmanAppDB_v2';
const STORES = {
    COMPETITORS: 'competitors',
    EVENTS: 'events',
    APP_STATE: 'appState',
    CHECKPOINTS: 'checkpoints'
};

// --- Inicjalizacja Bazy Danych ---
export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);

        request.onerror = e => {
            console.error(`Błąd bazy danych ${DB_NAME}:`, e.target.error);
            reject(e.target.error);
        };
        request.onsuccess = e => {
            db = e.target.result;
            resolve();
        };
        request.onupgradeneeded = e => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORES.COMPETITORS)) {
                db.createObjectStore(STORES.COMPETITORS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.EVENTS)) {
                db.createObjectStore(STORES.EVENTS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.APP_STATE)) {
                db.createObjectStore(STORES.APP_STATE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.CHECKPOINTS)) {
                db.createObjectStore(STORES.CHECKPOINTS, { keyPath: 'key' });
            }
        };
    });
}

// --- Generyczna Funkcja Pomocnicza ---
function dbAction(storeName, mode, action, data) {
    return new Promise((resolve, reject) => {
        if (!db) return reject("Baza danych nie jest zainicjowana.");
        try {
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = action(store, data);
            request.onerror = e => reject(e.target.error);
            request.onsuccess = e => resolve(e.target.result);
        } catch (error) { reject(error); }
    });
}

// --- Operacje na Zawodnikach ---
export async function getCompetitors() {
    const competitors = await dbAction(STORES.COMPETITORS, 'readonly', store => store.getAll());
    return competitors.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}
export async function saveCompetitor(competitorData) {
    const action = competitorData.id ? 'put' : 'add';
    if (!competitorData.id) delete competitorData.id;
    return await dbAction(STORES.COMPETITORS, 'readwrite', (store, data) => store[action](data), competitorData);
}
export async function deleteCompetitor(id) {
    return await dbAction(STORES.COMPETITORS, 'readwrite', (store, key) => store.delete(key), id);
}
export async function getCompetitorById(id) {
    return await dbAction(STORES.COMPETITORS, 'readonly', (store, key) => store.get(key), id);
}
export async function seedCompetitorsDatabaseIfNeeded() {
    const competitors = await getCompetitors();
    if (competitors.length === 0 && INITIAL_COMPETITORS.length > 0) {
        showNotification('Wypełniam bazę początkowymi zawodnikami...', 'info', 4000);
        const transaction = db.transaction(STORES.COMPETITORS, 'readwrite');
        INITIAL_COMPETITORS.forEach(c => transaction.objectStore(STORES.COMPETITORS).add(c));
        return new Promise(resolve => transaction.oncomplete = resolve);
    }
}
export function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
export async function importCompetitorsFromJson(importedData) {
    let added = 0, updated = 0;
    const currentCompetitors = await getCompetitors();
    const currentNames = new Map(currentCompetitors.map(c => [c.name.toLowerCase(), c]));
    for (const importedComp of importedData) {
        if (!importedComp || typeof importedComp !== 'object' || !importedComp.name) continue;
        const existingComp = currentNames.get(importedComp.name.toLowerCase());
        delete importedComp.id;
        if (existingComp) {
            await saveCompetitor({ ...existingComp, ...importedComp });
            updated++;
        } else {
            await saveCompetitor(importedComp);
            added++;
        }
    }
    return { added, updated };
}
export async function exportCompetitorsToJson() {
    const competitors = await getCompetitors();
    const dataStr = JSON.stringify(competitors, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'strongman_baza_zawodnikow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Baza zawodników wyeksportowana.', 'success');
}

// --- Operacje na Konkurencjach ---
export async function getEvents() {
    const events = await dbAction(STORES.EVENTS, 'readonly', store => store.getAll());
    return events.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}
export async function saveEvent(eventData) {
    const action = eventData.id ? 'put' : 'add';
    if (!eventData.id) delete eventData.id;
    return await dbAction(STORES.EVENTS, 'readwrite', (store, data) => store[action](data), eventData);
}
export async function deleteEvent(id) {
    return await dbAction(STORES.EVENTS, 'readwrite', (store, key) => store.delete(key), id);
}
export async function seedEventsDatabaseIfNeeded() {
    const events = await getEvents();
    if (events.length === 0 && INITIAL_EVENTS.length > 0) {
        showNotification('Wypełniam bazę początkowymi konkurencjami...', 'info', 4000);
        const transaction = db.transaction(STORES.EVENTS, 'readwrite');
        INITIAL_EVENTS.forEach(e => transaction.objectStore(STORES.EVENTS).add(e));
        return new Promise(resolve => transaction.oncomplete = resolve);
    }
}
export async function importEventsFromJson(importedData) {
    let added = 0, updated = 0;
    const currentEvents = await getEvents();
    const currentNames = new Map(currentEvents.map(e => [e.name.toLowerCase(), e]));
    for (const importedEvent of importedData) {
        if (!importedEvent.name || !importedEvent.type) continue;
        const existingEvent = currentNames.get(importedEvent.name.toLowerCase());
        delete importedEvent.id;
        if (existingEvent) {
            await saveEvent({ ...existingEvent, ...importedEvent });
            updated++;
        } else {
            await saveEvent(importedEvent);
            added++;
        }
    }
    return { added, updated };
}
export async function exportEventsToJson() {
    const events = await getEvents();
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'strongman_baza_konkurencji.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Baza konkurencji wyeksportowana.', 'success');
}

// --- Operacje na Stanie Aplikacji (Autosave) ---
export async function saveCurrentState(stateToSave) {
    const record = { id: 'lastState', ...stateToSave };
    return await dbAction(STORES.APP_STATE, 'readwrite', (store, data) => store.put(data), record);
}
export async function loadLastState() {
    return await dbAction(STORES.APP_STATE, 'readonly', (store, key) => store.get(key), 'lastState');
}
export async function clearAutoSaveState() {
    return await dbAction(STORES.APP_STATE, 'readwrite', (store, key) => store.delete(key), 'lastState');
}

// --- Operacje na Punktach Kontrolnych ---
export async function saveCheckpointDB(key, data) {
    const record = { key, ...data };
    return await dbAction(STORES.CHECKPOINTS, 'readwrite', (store, r) => store.put(r), record);
}
export async function getCheckpointsDB() {
    const checkpoints = await dbAction(STORES.CHECKPOINTS, 'readonly', store => store.getAll());
    return checkpoints.sort((a, b) => b.key.localeCompare(a.key));
}
export async function deleteCheckpointDB(key) {
    return await dbAction(STORES.CHECKPOINTS, 'readwrite', (store, k) => store.delete(k), key);
}
export async function clearAllCheckpointsDB() {
    return await dbAction(STORES.CHECKPOINTS, 'readwrite', store => store.clear());
}
