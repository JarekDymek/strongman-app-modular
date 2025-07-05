// Plik: js/main.js
// Cel: Główny plik aplikacji, który importuje wszystkie inne moduły i łączy je ze sobą, rejestrując detektory zdarzeń.

import * as UI from './ui.js';
import * as State from './state.js';
import * as History from './history.js';
import * as Persistence from './persistence.js';
import * as Database from './database.js';
import * as Stopwatch from './stopwatch.js';
import * as FocusMode from './focusMode.js';
import * as Handlers from './handlers.js';

/**
 * Odświeża cały interfejs użytkownika na podstawie aktualnego stanu aplikacji.
 */
function refreshFullUI() {
    const currentState = State.getState();
    State.setAllDbCompetitors(currentState.allDbCompetitors || []);
    
    if (currentState.competitors && currentState.competitors.length > 0) {
        UI.switchView('main');
        UI.updateEventTitle(currentState.eventNumber, currentState.eventTitle);
        UI.updateEventTypeButtons(currentState.currentEventType);
        UI.renderTable();
        
        const resultInputs = document.querySelectorAll('#resultsTable .resultInput');
        resultInputs.forEach(input => {
            const competitorName = input.dataset.name;
            const event = currentState.eventHistory.find(e => e.nr === currentState.eventNumber);
            if (event) {
                const result = event.results.find(r => r.name === competitorName);
                if (result) {
                    input.value = result.result;
                }
            }
        });

        const lastEvent = currentState.eventHistory[currentState.eventHistory.length - 1];
        if (lastEvent && lastEvent.nr === currentState.eventNumber) {
            UI.updateTableWithEventData(lastEvent.results);
            UI.lockResultInputs();
        }
    } else {
        UI.switchView('intro');
        UI.renderCompetitorSelectionUI(State.getAllDbCompetitors());
    }
    UI.setLogoUI(currentState.logoData);
    UI.DOMElements.eventNameInput.value = currentState.eventName || '';
    UI.DOMElements.eventLocationInput.value = currentState.eventLocation || '';
}

/**
 * Rejestruje wszystkie detektory zdarzeń (event listeners) dla elementów interfejsu.
 */
function setupEventListeners() {
    Stopwatch.setupStopwatchEventListeners();
    FocusMode.setupFocusModeEventListeners();
    
    // --- General UI & Meta ---
    document.getElementById('themeSelector').addEventListener('change', Handlers.handleThemeChange);
    document.getElementById('selectLogoBtn').addEventListener('click', () => document.getElementById('logoUpload').click());
    document.getElementById('logoUpload').addEventListener('change', Handlers.handleLogoUpload);
    document.getElementById('logoImg').addEventListener('dblclick', Handlers.handleRemoveLogo);
    document.getElementById('eventNameInput').addEventListener('input', (e) => {
        State.state.eventName = e.target.value;
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    });
    document.getElementById('eventLocationInput').addEventListener('input', (e) => {
        State.state.eventLocation = e.target.value;
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    });
    document.getElementById('eventTitle').addEventListener('input', (e) => {
        State.state.eventTitle = e.target.textContent;
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    });

    // --- Intro Screen ---
    document.getElementById('startCompetitionBtn').addEventListener('click', () => {
        if (Handlers.handleStartCompetition()) {
            refreshFullUI();
        }
    });
    document.getElementById('categoryFilters').addEventListener('click', Handlers.handleFilterChange);
    document.getElementById('competitorSelectionList').addEventListener('change', Handlers.handleSelectionChange);

    // --- Main Screen Actions ---
    document.getElementById('shuffleBtn').addEventListener('click', () => {
        if (Handlers.handleShuffle()) {
            UI.renderTable();
        }
    });
    document.getElementById('showResultsBtn').addEventListener('click', UI.toggleHistoryPanel);
    document.getElementById('nextEventBtn').addEventListener('click', async () => {
        if (await Handlers.handleNextEvent()) {
            refreshFullUI();
        }
    });
    document.getElementById('finalEventBtn').addEventListener('click', async () => {
        if (await Handlers.handleFinalEvent()) {
            refreshFullUI();
        }
    });
    document.getElementById('calculatePointsBtn').addEventListener('click', Handlers.handleCalculatePoints);
    document.getElementById('showFinalSummaryBtn').addEventListener('click', UI.renderFinalSummary);
    document.getElementById('highTypeBtn').addEventListener('click', () => Handlers.handleEventTypeChange('high'));
    document.getElementById('lowTypeBtn').addEventListener('click', () => Handlers.handleEventTypeChange('low'));
    document.getElementById('toggleTableWidthBtn').addEventListener('click', (e) => {
        const wrapper = document.querySelector('.table-wrapper');
        wrapper.classList.toggle('expanded');
        e.target.textContent = wrapper.classList.contains('expanded') ? 'Zwiń Tabelę' : 'Rozwiń Tabelę';
    });

    // --- Table & Main Content Clicks ---
    document.getElementById('mainContent').addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const competitorName = target.closest('tr')?.dataset.name;

        if (target.closest('.tie-info')) {
            target.closest('.tie-info').classList.toggle('tooltip-active');
        } else if (action === 'showDetails' && competitorName) {
            UI.showCompetitorDetails(State.getCompetitorProfile(competitorName));
        } else if(action === 'openStopwatch' && competitorName) {
            Stopwatch.enterStopwatch(competitorName, Handlers.handleStopwatchSave);
        } else if (target.classList.contains('resultInput') && !target.readOnly) {
            FocusMode.handleEnterFocusMode(target.dataset.name);
        }
    });
    
    document.getElementById('resultsTable').addEventListener('change', (e) => {
        if (e.target.classList.contains('resultInput')) {
            History.saveToUndoHistory(State.getState());
            Persistence.triggerAutoSave();
            
            e.target.classList.add('highlight-flash-input');
            setTimeout(() => {
                e.target.classList.remove('highlight-flash-input');
            }, 1000);
        }
    });

    // --- History & Editing ---
    document.getElementById('historyPanel').addEventListener('click', (e) => {
        const eventId = e.target.dataset.eventId;
        if (eventId) UI.renderEventForEditing(parseInt(eventId));
        if (e.target.dataset.action === 'save-recalculate') {
            if (Handlers.handleSaveAndRecalculate(parseInt(e.target.dataset.eventId))) {
                refreshFullUI();
            }
        }
    });
    document.getElementById('undoBtn').addEventListener('click', () => {
        if (Handlers.handleUndo()) {
            refreshFullUI();
        }
    });
    document.getElementById('redoBtn').addEventListener('click', () => {
        if (Handlers.handleRedo()) {
            refreshFullUI();
        }
    });

    // --- Databases & Modals ---
    document.getElementById('manageDbBtn').addEventListener('click', Handlers.handleManageCompetitors);
    document.getElementById('closeDbPanelBtn').addEventListener('click', () => document.getElementById('competitorDbPanel').classList.remove('visible'));
    document.getElementById('exportDbBtn').addEventListener('click', Database.exportCompetitorsToJson);
    document.getElementById('importDbTrigger').addEventListener('click', () => document.getElementById('importDbFile').click());
    document.getElementById('importDbFile').addEventListener('change', (e) => { Handlers.handleDbFileImport(e.target.files[0]); e.target.value = null; });
    document.getElementById('competitorForm').addEventListener('submit', Handlers.handleCompetitorFormSubmit);
    document.getElementById('competitorListContainer').addEventListener('click', Handlers.handleCompetitorListAction);
    
    document.getElementById('manageEventsDbBtn').addEventListener('click', Handlers.handleManageEvents);
    document.getElementById('eventForm').addEventListener('submit', Handlers.handleEventFormSubmit);
    document.getElementById('eventListContainer').addEventListener('click', Handlers.handleEventListAction);
    document.getElementById('closeEventDbPanelBtn').addEventListener('click', () => document.getElementById('eventDbPanel').classList.remove('visible'));
    document.getElementById('exportEventsDbBtn').addEventListener('click', Database.exportEventsToJson);
    document.getElementById('importEventsDbTrigger').addEventListener('click', () => document.getElementById('importEventsDbFile').click());
    document.getElementById('importEventsDbFile').addEventListener('change', (e) => { Handlers.handleEventsDbFileImport(e.target.files[0]); e.target.value = null; });

    document.getElementById('selectEventFromDbBtn').addEventListener('click', Handlers.handleSelectEventFromDb);
    document.getElementById('selectEventList').addEventListener('click', Handlers.handleEventSelection);
    document.getElementById('selectEventCancelBtn').addEventListener('click', () => document.getElementById('selectEventModal').classList.remove('visible'));
    document.getElementById('competitorDetailCloseBtn').addEventListener('click', () => document.getElementById('competitorDetailModal').classList.remove('visible'));

    // --- Persistence & Export ---
    document.getElementById('exportHtmlBtn').addEventListener('click', Handlers.handleExportHtml);
    document.getElementById('resetCompetitionBtn').addEventListener('click', Persistence.resetApplication);
    document.getElementById('saveCheckpointBtn').addEventListener('click', Persistence.saveCheckpoint);
    document.getElementById('showCheckpointsBtn').addEventListener('click', () => Persistence.handleShowCheckpoints());
    document.getElementById('checkpointList').addEventListener('click', (e) => Persistence.handleCheckpointListActions(e, refreshFullUI));
    document.getElementById('exportStateBtn_main').addEventListener('click', () => Persistence.exportStateToFile());
    document.getElementById('importStateBtn_main').addEventListener('click', () => document.getElementById('importFile_main').click());
    document.getElementById('importFile_main').addEventListener('change', async (e) => { 
        if (await Handlers.handleImportState(e.target.files[0], refreshFullUI)) {
            refreshFullUI();
        }
        e.target.value = null; 
    });
    document.getElementById('exportStateBtn_intro').addEventListener('click', () => Persistence.exportStateToFile(true));
    document.getElementById('importStateBtn_intro').addEventListener('click', () => document.getElementById('importFile_intro').click());
    document.getElementById('importStateBtn_intro').addEventListener('change', async (e) => { 
        if (await Handlers.handleImportState(e.target.files[0], refreshFullUI)) {
            refreshFullUI();
        }
        e.target.value = null; 
    });

    // --- Gemini AI ---
    document.getElementById('generateEventNameBtn').addEventListener('click', Handlers.handleGenerateEventName);
    document.getElementById('generateAnnounceBtn').addEventListener('click', Handlers.handleGenerateAnnouncement);
    document.getElementById('geminiCloseBtn').addEventListener('click', () => document.getElementById('geminiModal').classList.remove('visible'));
}

/**
 * Główna funkcja inicjalizująca aplikację.
 */
async function initializeApp() {
    try {
        UI.initUI();
        Stopwatch.initStopwatch();
        
        await Database.initDB();
        
        await Database.seedCompetitorsDatabaseIfNeeded();
        await Database.seedEventsDatabaseIfNeeded();
        
        setupEventListeners();

        const savedTheme = Persistence.loadTheme();
        document.body.className = savedTheme;
        UI.DOMElements.themeSelector.value = savedTheme;

        const loadedFromAutoSave = await Persistence.loadStateFromAutoSave();
        if (loadedFromAutoSave) {
            refreshFullUI();
        } else {
            await Handlers.loadAndRenderInitialData();
            State.state.eventName = UI.DOMElements.eventNameInput.value;
        }
        History.clearHistory();
        History.saveToUndoHistory(State.getState());
        UI.showNotification("Aplikacja gotowa!", "success", 2000);
    } catch (error) {
        console.error("Krytyczny błąd podczas inicjalizacji:", error);
        UI.showNotification("Wystąpił błąd krytyczny. Odśwież stronę.", "error", 10000);
    }
}

// Uruchomienie aplikacji po załadowaniu drzewa DOM
document.addEventListener('DOMContentLoaded', initializeApp);
