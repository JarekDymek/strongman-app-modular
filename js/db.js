// Plik: js/db.js
// Cel: Zarządzanie bazą danych zawodników (IndexedDB).

import { showNotification } from './ui.js';
import { INITIAL_COMPETITORS } from './initialData.js';

let competitorDb;

export function dbAction(dbInstance, storeName, mode, action, data) {
    return new Promise((resolve, reject) => {
        if (!dbInstance) return reject("Baza danych nie jest zainicjowana.");
        try {
            const transaction = dbInstance.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            const request = action(store, data);
            request.onerror = e => reject(e.target.error);
            request.onsuccess = e => resolve(e.target.result);
        } catch (error) { reject(error); }
    });
}

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StrongmanDB_v12_Competitors", 2);
        request.onerror = e => { console.error("Błąd bazy danych zawodników:", e.target.error); reject(e.target.error); };
        request.onsuccess = e => { competitorDb = e.target.result; resolve(); };
        request.onupgradeneeded = e => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains('competitors')) {
                let store = db.createObjectStore('competitors', { keyPath: 'id', autoIncrement: true });
                store.createIndex('name_idx', 'name', { unique: true });
            }
        };
    });
}

export async function getCompetitors() {
    const competitors = await dbAction(competitorDb, 'competitors', 'readonly', store => store.getAll());
    return competitors.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function getCompetitorById(id) {
    return await dbAction(competitorDb, 'competitors', 'readonly', (store, data) => store.get(data), id);
}

export async function saveCompetitor(competitorData) {
    if (competitorData.id) {
        return await dbAction(competitorDb, 'competitors', 'readwrite', (store, data) => store.put(data), competitorData);
    } else {
        delete competitorData.id;
        return await dbAction(competitorDb, 'competitors', 'readwrite', (store, data) => store.add(data), competitorData);
    }
}

export async function deleteCompetitor(id) {
    return await dbAction(competitorDb, 'competitors', 'readwrite', (store, data) => store.delete(data), id);
}

export async function seedCompetitorsDatabaseIfNeeded() {
    const competitors = await getCompetitors();
    if (competitors.length === 0 && INITIAL_COMPETITORS.length > 0) {
        showNotification('Wypełniam bazę początkowymi zawodnikami...', 'info', 4000);
        await Promise.all(INITIAL_COMPETITORS.map(c => saveCompetitor(c)));
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
    if (!Array.isArray(importedData)) {
        throw new Error("Plik importu musi być listą (tablicą) zawodników.");
    }
    let added = 0;
    let updated = 0;
    const currentCompetitors = await getCompetitors();
    const currentNames = new Map(currentCompetitors.map(c => [c.name.toLowerCase(), c]));

    for (const importedComp of importedData) {
        if (!importedComp || typeof importedComp !== 'object' || !importedComp.name) {
            console.warn("Pominięto nieprawidłowy wpis w importowanym pliku:", importedComp);
            continue;
        }

        const existingComp = currentNames.get(importedComp.name.toLowerCase());
        
        delete importedComp.id;

        if (existingComp) {
            const dataToUpdate = { ...existingComp, ...importedComp };
            await saveCompetitor(dataToUpdate);
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
