// Plik: js/persistence.js
// Cel: Odpowiada za utrwalanie stanu (auto-save, checkpoints, motyw) i eksporty.

import { getState, restoreState, resetState, state, getLogo, getEventHistory } from './state.js';
import { showNotification, showConfirmation, DOMElements, renderFinalSummary } from './ui.js';
import { clearHistory } from './history.js';

const AUTO_SAVE_KEY = 'strongmanState_autoSave_v12';
const THEME_KEY = 'strongmanTheme_v12';
const CHECKPOINT_PREFIX = 'strongmanCheckpoint_v12_';
let autoSaveTimer;

export function saveTheme(themeName) { localStorage.setItem(THEME_KEY, themeName); }
export function loadTheme() { return localStorage.getItem(THEME_KEY) || 'light'; }

export function triggerAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        if (document.getElementById('mainContent').style.display === 'block') {
            try {
                localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(getState()));
                const indicator = document.getElementById('saveIndicator');
                indicator.classList.add('visible');
                setTimeout(() => indicator.classList.remove('visible'), 1500);
            } catch(e) {
                 showNotification("Błąd auto-zapisu. Pamięć może być pełna.", "error");
            }
        }
    }, 1000);
}

export async function loadStateFromAutoSave() {
    const savedStateJSON = localStorage.getItem(AUTO_SAVE_KEY);
    if (!savedStateJSON) return false;

    if (await showConfirmation("Wykryto niezakończoną sesję. Czy chcesz ją przywrócić?")) {
        try {
            const loadedState = JSON.parse(savedStateJSON);
            restoreState(loadedState);
            showNotification("Sesja została przywrócona!", "success");
            return true;
        } catch (error) {
            showNotification("Plik auto-zapisu uszkodzony. Zostanie usunięty.", "error");
            localStorage.removeItem(AUTO_SAVE_KEY);
            return false;
        }
    } else {
        localStorage.removeItem(AUTO_SAVE_KEY);
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
    if (await showConfirmation("Czy na pewno chcesz zresetować całą aplikację? Spowoduje to usunięcie wszystkich danych i punktów kontrolnych.")) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('strongman')) {
                localStorage.removeItem(key);
            }
        });
        resetState();
        showNotification("Aplikacja została zresetowana.", "success");
        window.location.reload();
    }
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getLocalStorageUsage() {
    let total = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += (localStorage[key].length + key.length) * 2;
        }
    }
    return total;
}

function getMinimalStateForCheckpoint() {
    const fullState = getState();
    return {
        competitors: fullState.competitors,
        scores: fullState.scores,
        eventNumber: fullState.eventNumber,
        eventHistory: fullState.eventHistory,
        logoData: fullState.logoData,
        currentEventType: fullState.currentEventType,
        eventName: fullState.eventName,
        eventLocation: fullState.eventLocation,
        eventTitle: fullState.eventTitle,
    };
}

export async function saveCheckpoint() {
    const checkpointName = `Punkt z ${new Date().toLocaleString('pl-PL')}`;
    if (await showConfirmation(`Czy na pewno zapisać punkt kontrolny "${checkpointName}"?`)) {
        const key = CHECKPOINT_PREFIX + new Date().toISOString();
        const data = {
            name: checkpointName,
            state: getMinimalStateForCheckpoint()
        };
        try {
            localStorage.setItem(key, JSON.stringify(data));
            showNotification(`Zapisano punkt kontrolny: "${checkpointName}"`, "success");
            handleShowCheckpoints(true); 
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                showNotification("Błąd: Pamięć przeglądarki jest pełna. Usuń stare punkty kontrolne.", "error", 6000);
                handleShowCheckpoints(true);
            } else {
                showNotification("Wystąpił nieznany błąd podczas zapisu.", "error");
                console.error("Błąd zapisu checkpointu:", e);
            }
        }
    }
}

export function handleShowCheckpoints(forceShow = false) {
    const container = DOMElements.checkpointList;
    const listContainer = DOMElements.checkpointListContainer;
    
    const checkpoints = Object.keys(localStorage)
        .filter(key => key.startsWith(CHECKPOINT_PREFIX))
        .map(key => {
            try {
                const value = localStorage.getItem(key);
                if (!value) return null;
                return { 
                    key, 
                    corrupted: false,
                    data: JSON.parse(value),
                    size: (key.length + value.length) * 2
                };
            } catch (error) {
                return { 
                    key, 
                    corrupted: true, 
                    reason: 'Błąd formatu danych (JSON)',
                    size: (key.length + (localStorage.getItem(key)?.length || 0)) * 2
                };
            }
        })
        .filter(Boolean)
        .sort((a, b) => b.key.localeCompare(a.key));

    const totalUsage = getLocalStorageUsage();
    DOMElements.storageUsage.textContent = `Zajęte: ${formatBytes(totalUsage)} / ~5 MB`;

    if (checkpoints.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 10px 0;">Brak zapisanych punktów.</p>';
    } else {
        container.innerHTML = checkpoints.map(cp => {
            if (cp.corrupted) {
                return `
                    <div class="checkpoint-item">
                        <button disabled style="background-color: #fee; border: 1px solid #f88; color: #c00; cursor: not-allowed;">
                            Uszkodzony Punkt Kontrolny
                            <small>${new Date(cp.key.replace(CHECKPOINT_PREFIX, '')).toLocaleString('pl-PL')} (Błąd: ${cp.reason})</small>
                        </button>
                        <span class="checkpoint-size">${formatBytes(cp.size)}</span>
                        <button class="delete-checkpoint-btn" data-action="delete-checkpoint" data-key="${cp.key}" title="Trwale usuń uszkodzony wpis">🗑️</button>
                    </div>
                `;
            } else {
                return `
                    <div class="checkpoint-item">
                        <button data-action="load-checkpoint" data-key="${cp.key}">
                            ${cp.data.name}
                            <small>${new Date(cp.key.replace(CHECKPOINT_PREFIX, '')).toLocaleString('pl-PL')}</small>
                        </button>
                        <span class="checkpoint-size">${formatBytes(cp.size)}</span>
                        <button class="delete-checkpoint-btn" data-action="delete-checkpoint" data-key="${cp.key}" title="Usuń ten punkt kontrolny">🗑️</button>
                    </div>
                `;
            }
        }).join('');
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
        const checkpointData = JSON.parse(localStorage.getItem(key));
        if (await showConfirmation(`Czy na pewno chcesz wczytać punkt kontrolny "${checkpointData.name}"? Obecny stan zostanie utracony.`)) {
            restoreState(checkpointData.state);
            clearHistory();
            refreshFullUICallback();
            DOMElements.checkpointListContainer.style.display = 'none';
            showNotification("Punkt kontrolny został wczytany.", "success");
        }
    } else if (action === 'delete-checkpoint') {
         if (await showConfirmation(`Czy na pewno chcesz trwale usunąć ten punkt kontrolny? Tej operacji nie można cofnąć.`)) {
             localStorage.removeItem(key);
             showNotification("Punkt kontrolny usunięty.", "success");
             handleShowCheckpoints(true);
         }
    }
}

// --- NOWA, NIEZAWODNA WERSJA EKSPORTU DO PDF ---
export async function exportToPdf() {
    showNotification("Generowanie pliku PDF...", "info", 5000);
    const { jsPDF } = window.jspdf;
    const exportContainer = document.getElementById('pdf-export-container');

    // 1. Zbuduj HTML raportu
    if (!document.getElementById('finalSummaryPanel')) renderFinalSummary();
    const summaryTable = document.querySelector('#finalSummaryPanel table');
    if (!summaryTable) {
        return showNotification("Brak podsumowania do wygenerowania.", "error");
    }

    const logoSrc = getLogo() || '';
    const eventName = state.eventName || 'Zawody Strongman';
    const location = state.eventLocation || '';
    const date = new Date().toLocaleString('pl-PL');

    let reportHTML = `
        <div class="pdf-header">
            ${logoSrc ? `<img src="${logoSrc}" class="pdf-logo">` : ''}
            <h1>${eventName}</h1>
            <h2>${location}</h2>
            <p>Data: ${date}</p>
        </div>
        <h3>Końcowa klasyfikacja</h3>
        ${summaryTable.outerHTML}
        <h3>Szczegółowe Wyniki Konkurencji</h3>
    `;

    const eventHistory = getEventHistory();
    for (const event of eventHistory) {
        const eventResults = event.results.sort((a,b) => (a.place || Infinity) - (b.place || Infinity));
        reportHTML += `
            <h4>${event.nr}. ${event.name} (${event.type === 'high' ? 'Więcej = lepiej' : 'Mniej = lepiej'})</h4>
            <table>
                <thead>
                    <tr>
                        <th>M-ce</th>
                        <th>Zawodnik</th>
                        <th>Wynik</th>
                        <th>Pkt.</th>
                    </tr>
                </thead>
                <tbody>
                    ${eventResults.map(res => `
                        <tr>
                            <td>${res.place ?? '-'}</td>
                            <td>${res.name ?? '-'}</td>
                            <td>${res.result ?? '-'}</td>
                            <td>${res.points ?? '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    exportContainer.innerHTML = reportHTML;

    // 2. Użyj html2canvas do stworzenia obrazu
    try {
        const canvas = await html2canvas(exportContainer, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        // 3. Wstaw obraz do pliku PDF
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = imgWidth / imgHeight;
        
        let finalImgWidth = pdfWidth - 40; // z marginesami
        let finalImgHeight = finalImgWidth / ratio;

        if (finalImgHeight > pdfHeight - 40) {
            finalImgHeight = pdfHeight - 40;
            finalImgWidth = finalImgHeight * ratio;
        }

        const xPos = (pdfWidth - finalImgWidth) / 2;
        const yPos = 20;

        pdf.addImage(imgData, 'PNG', xPos, yPos, finalImgWidth, finalImgHeight);
        pdf.save(`wyniki_${(state.eventName || 'zawody').replace(/[\s\/]/g, '_')}.pdf`);
        showNotification("PDF został wygenerowany!", "success");

    } catch (error) {
        console.error("Błąd podczas generowania PDF:", error);
        showNotification("Wystąpił błąd podczas generowania PDF.", "error");
    } finally {
        exportContainer.innerHTML = ''; // Wyczyść kontener po użyciu
    }
}
