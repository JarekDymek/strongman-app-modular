// Plik: js/persistence.js
// Cel: Zarządza utrwalaniem stanu i eksportami.

import { getState, restoreState, resetState, state, getLogo, getEventHistory } from './state.js';
import { showNotification, showConfirmation, DOMElements, renderFinalSummary } from './ui.js';
import { clearHistory } from './history.js';
import * as Database from './database.js'; // POPRAWKA: Używamy jednego, centralnego modułu bazy danych

const THEME_KEY = 'strongmanTheme_v12';
let autoSaveTimer;

export function saveTheme(themeName) { localStorage.setItem(THEME_KEY, themeName); }
export function loadTheme() { return localStorage.getItem(THEME_KEY) || 'light'; }

export function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
        if (document.getElementById('mainContent').style.display === 'block') {
            try {
                await Database.saveCurrentState(getState());
                const indicator = document.getElementById('saveIndicator');
                indicator.classList.add('visible');
                setTimeout(() => indicator.classList.remove('visible'), 1500);
            } catch(e) {
                 showNotification("Błąd auto-zapisu.", "error");
                 console.error("Błąd auto-zapisu do IndexedDB:", e);
            }
        }
    }, 1000);
}

export async function loadStateFromAutoSave() {
    const savedState = await Database.loadLastState();
    if (!savedState) return false;

    if (await showConfirmation("Wykryto niezakończoną sesję. Czy chcesz ją przywrócić?")) {
        restoreState(savedState);
        showNotification("Sesja została przywrócona!", "success");
        return true;
    } else {
        await Database.clearAutoSaveState();
        return false;
    }
}

export function exportStateToFile(isInitial = false) {
    const stateData = getState();
    const stateJson = JSON.stringify(stateData, null, 2);
    const blob = new Blob([stateJson], { type: 'application/json' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const eventName = (document.getElementById('eventNameInput').value || 'zawody').replace(/[\s\/]/g, '_');
    const location = (document.getElementById('eventLocationInput').value || 'lokalizacja').replace(/[\s\/]/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    
    let filename = `${location}_${eventName}_${date}`;
    if (isInitial) {
        filename += '_stan_poczatkowy.json';
    } else {
        filename += `_konkurencja_${state.eventNumber}.json`;
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    showNotification("Stan aplikacji został wyeksportowany.", "success");
}

export async function importStateFromFile(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData.competitors || !importedData.eventHistory) {
                    throw new Error("Plik nie wygląda na prawidłowy plik stanu aplikacji.");
                }
                if (await showConfirmation("Czy na pewno chcesz importować stan z pliku? Spowoduje to nadpisanie bieżącej sesji.")) {
                    restoreState(importedData);
                    clearHistory();
                    await Database.saveCurrentState(getState());
                    showNotification("Stan pomyślnie zaimportowano!", "success");
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (error) {
                showNotification(`Błąd: ${error.message}`, "error");
                resolve(false);
            }
        };
        reader.readAsText(file);
    });
}

export async function resetApplication() {
    if (await showConfirmation("Czy na pewno chcesz zresetować całą aplikację? Spowoduje to usunięcie wszystkich danych, w tym punktów kontrolnych z bazy danych.")) {
        localStorage.removeItem(THEME_KEY);
        await Database.clearAllCheckpointsDB();
        await Database.clearAutoSaveState();
        resetState();
        showNotification("Aplikacja została zresetowana.", "success");
        window.location.reload();
    }
}

function getMinimalStateForCheckpoint() {
    return getState();
}

export async function saveCheckpoint() {
    const checkpointName = `Punkt z ${new Date().toLocaleString('pl-PL')}`;
    if (await showConfirmation(`Czy na pewno zapisać punkt kontrolny "${checkpointName}"?`)) {
        const key = `checkpoint_${new Date().toISOString()}`;
        const data = {
            name: checkpointName,
            state: getMinimalStateForCheckpoint()
        };
        try {
            await Database.saveCheckpointDB(key, data);
            showNotification(`Zapisano punkt kontrolny: "${checkpointName}"`, "success");
            handleShowCheckpoints(true); 
        } catch (e) {
            showNotification("Wystąpił błąd podczas zapisu punktu kontrolnego.", "error");
            console.error("Błąd zapisu checkpointu do IndexedDB:", e);
        }
    }
}

export async function handleShowCheckpoints(forceShow = false) {
    const container = DOMElements.checkpointList;
    const listContainer = DOMElements.checkpointListContainer;
    
    const checkpoints = await Database.getCheckpointsDB();

    DOMElements.storageUsage.textContent = `Zapisano: ${checkpoints.length} punktów`;

    if (checkpoints.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 10px 0;">Brak zapisanych punktów.</p>';
    } else {
        container.innerHTML = checkpoints.map(cp => `
            <div class="checkpoint-item">
                <button data-action="load-checkpoint" data-key="${cp.key}">
                    ${cp.name}
                    <small>${new Date(cp.key.replace('checkpoint_', '')).toLocaleString('pl-PL')}</small>
                </button>
                <button class="delete-checkpoint-btn" data-action="delete-checkpoint" data-key="${cp.key}" title="Usuń ten punkt kontrolny">🗑️</button>
            </div>
        `).join('');
    }
    
    if (forceShow) {
        listContainer.style.display = 'block';
    } else {
         const isVisible = listContainer.style.display === 'block';
         listContainer.style.display = isVisible ? 'none' : 'block';
    }
}

export async function handleCheckpointListActions(e, refreshFullUICallback) {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const key = button.dataset.key;

    if (action === 'load-checkpoint') {
        const checkpoints = await Database.getCheckpointsDB();
        const checkpointToLoad = checkpoints.find(cp => cp.key === key);
        if (checkpointToLoad && await showConfirmation(`Czy na pewno chcesz wczytać punkt kontrolny "${checkpointToLoad.name}"? Obecny stan zostanie utracony.`)) {
            restoreState(checkpointToLoad.state);
            clearHistory();
            refreshFullUICallback();
            DOMElements.checkpointListContainer.style.display = 'none';
            showNotification("Punkt kontrolny został wczytany.", "success");
        }
    } else if (action === 'delete-checkpoint') {
         if (await showConfirmation(`Czy na pewno chcesz trwale usunąć ten punkt kontrolny? Tej operacji nie można cofnąć.`)) {
             await Database.deleteCheckpointDB(key);
             showNotification("Punkt kontrolny usunięty.", "success");
             handleShowCheckpoints(true);
         }
    }
}
