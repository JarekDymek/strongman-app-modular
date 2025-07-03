// Plik: js/eventsDb.js
// Cel: Zarządzanie bazą danych konkurencji (IndexedDB).

import { showNotification } from './ui.js';
import { INITIAL_EVENTS } from './initialData.js';
import { dbAction } from './db.js';

let eventsDbInstance;

export function initEventsDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("StrongmanDB_v12_Events", 1);
        request.onerror = e => { console.error("Błąd bazy konkurencji:", e.target.error); reject(e.target.error); };
        request.onsuccess = e => { eventsDbInstance = e.target.result; resolve(); };
        request.onupgradeneeded = e => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains('events')) {
                db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

export async function getEvents() {
    const events = await dbAction(eventsDbInstance, 'events', 'readonly', store => store.getAll());
    return events.sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

export async function saveEvent(eventData) {
    if (eventData.id) {
        return await dbAction(eventsDbInstance, 'events', 'readwrite', (store, data) => store.put(data), eventData);
    } else {
        delete eventData.id;
        return await dbAction(eventsDbInstance, 'events', 'readwrite', (store, data) => store.add(data), eventData);
    }
}

export async function deleteEvent(id) {
     return await dbAction(eventsDbInstance, 'events', 'readwrite', (store, data) => store.delete(data), id);
}

// POPRAWKA: Upewniamy się, że ta funkcja jest poprawnie eksportowana.
export async function seedEventsDatabaseIfNeeded() {
    const events = await getEvents();
    if (events.length === 0 && INITIAL_EVENTS.length > 0) {
        showNotification('Wypełniam bazę początkowymi konkurencjami...', 'info', 4000);
        await Promise.all(INITIAL_EVENTS.map(e => saveEvent(e)));
    }
}

export async function importEventsFromJson(importedData) {
    if (!Array.isArray(importedData)) {
        throw new Error("Plik nie jest listą konkurencji.");
    }
    let added = 0;
    let updated = 0;
    const currentEvents = await getEvents();
    const currentNames = new Map(currentEvents.map(e => [e.name.toLowerCase(), e]));

    for (const importedEvent of importedData) {
        if (!importedEvent.name || !importedEvent.type) continue;
        const existingEvent = currentNames.get(importedEvent.name.toLowerCase());
        if (existingEvent) {
            const dataToUpdate = { ...existingEvent, ...importedEvent };
            await saveEvent(dataToUpdate);
            updated++;
        } else {
            delete importedEvent.id;
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
