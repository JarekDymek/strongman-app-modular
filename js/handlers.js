// Plik: js/handlers.js
// Cel: Zawiera wszystkie funkcje obsługi zdarzeń (handle...).

import * as State from './state.js';
import * as UI from './ui.js';
import * as Competition from './competition.js';
import * as CompetitorDB from './db.js';
import * as EventsDB from './eventsDb.js';
import * as History from './history.js';
import * as Persistence from './persistence.js';
import * as Stopwatch from './stopwatch.js';
import * as GeminiAPI from './api.js';
import * as FocusMode from './focusMode.js';

export async function loadAndRenderInitialData() {
    const competitorsFromDb = await CompetitorDB.getCompetitors();
    State.setAllDbCompetitors(competitorsFromDb);
    UI.renderCompetitorSelectionUI(competitorsFromDb);
}

export function handleThemeChange(e) {
    const theme = e.target.value;
    document.body.className = theme;
    Persistence.saveTheme(theme);
}

export async function handleLogoUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    History.saveToUndoHistory(State.getState());
    const data = await CompetitorDB.toBase64(file);
    State.setLogo(data); 
    UI.setLogoUI(data); 
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
}

export async function handleRemoveLogo() {
    if (!State.getLogo()) return;
    if (await UI.showConfirmation("Czy na pewno chcesz usunąć to logo?")) {
        History.saveToUndoHistory(State.getState());
        State.setLogo(null); 
        UI.setLogoUI(null); 
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    }
}

export function handleFilterChange(e) {
    if (e.target.matches('.filter-btn')) {
        UI.filterCompetitorSelectionList(e.target.dataset.filter);
    }
}

export function handleSelectionChange() {
    const count = document.querySelectorAll('#competitorSelectionList input:checked').length;
    UI.updateSelectionCounter(count);
}

export async function handleDbFileImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (await UI.showConfirmation(`Czy na pewno chcesz importować bazę danych?`)) {
                const { added, updated } = await CompetitorDB.importCompetitorsFromJson(importedData);
                UI.showNotification(`Import zakończony! Dodano: ${added}, Zaktualizowano: ${updated}.`, "success");
                await loadAndRenderInitialData();
            }
        } catch (error) { 
            UI.showNotification(`Błąd importu: ${error.message}`, "error"); 
        }
    };
    reader.readAsText(file);
}

export async function handleEventsDbFileImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (!Array.isArray(importedData)) throw new Error("Plik nie jest listą konkurencji.");
            if (await UI.showConfirmation(`Czy na pewno chcesz importować bazę konkurencji?`)) {
                const { added, updated } = await EventsDB.importEventsFromJson(importedData);
                UI.showNotification(`Import zakończony! Dodano: ${added}, Zakt: ${updated}.`, "success");
                await handleManageEvents();
            }
        } catch (error) { UI.showNotification("Błąd: Nieprawidłowy format pliku bazy.", "error"); }
    };
    reader.readAsText(file);
}

export async function handleImportState(file, refreshFullUICallback) {
    if (!file) return;
    const success = await Persistence.importStateFromFile(file);
    if (success) { refreshFullUICallback(); }
}

export function handleStartCompetition(refreshFullUICallback) {
    const selectedInputs = document.querySelectorAll('#competitorSelectionList input:checked');
    const selectedCompetitors = Array.from(selectedInputs).map(input => input.value);
    if (selectedCompetitors.length < 2) return UI.showNotification("Wybierz co najmniej dwóch zawodników.", "error");
    
    History.saveToUndoHistory(State.getState());
    State.startCompetition(selectedCompetitors);
    UI.switchView('main');
    UI.renderTable();
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    Persistence.exportStateToFile(true);
}

export function handleEventTypeChange(type) {
    History.saveToUndoHistory(State.getState());
    State.setEventType(type);
    UI.updateEventTypeButtons(type);
    Persistence.triggerAutoSave();
}

export function handleCalculatePoints() {
    History.saveToUndoHistory(State.getState());
    const resultInputs = document.querySelectorAll('#resultsTable .resultInput');
    const currentResults = Array.from(resultInputs).map(input => ({ name: input.dataset.name, result: input.value }));
    const { results, error } = Competition.calculateEventPoints(currentResults, State.getActiveCompetitors().length, State.getEventType());
    if (error) return UI.showNotification("Proszę wpisać prawidłowe wartości liczbowe lub użyć formatu MM:SS.ss dla czasu.", "error");
    
    const eventName = document.getElementById('eventTitle').textContent;
    State.addEventToHistory({ nr: State.getEventNumber(), name: eventName, type: State.getEventType(), results: results });
    UI.updateTableWithEventData(results);
    UI.lockResultInputs();
    UI.showNotification(`Punkty dla "${eventName}" zostały przyznane!`, "success");
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
    Persistence.exportStateToFile();
}

export async function handleNextEvent() {
    const inputs = document.querySelectorAll('#resultsTable .resultInput:not([readonly])');
    if (inputs.length > 0 && !await UI.showConfirmation("Nie przyznano punktów dla bieżącej konkurencji. Czy na pewno chcesz kontynuować?")) {
        return;
    }
    History.saveToUndoHistory(State.getState());
    State.nextEvent();
    UI.updateEventTitle(State.getEventNumber(), State.state.eventTitle);
    UI.renderTable();
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
}

export function handleShuffle() {
    History.saveToUndoHistory(State.getState());
    State.shuffleCompetitors();
    UI.renderTable();
    Persistence.triggerAutoSave();
}

export async function handleFinalEvent() {
    const success = await Competition.setupFinalEvent(Competition.breakTie);
    if (success) {
        UI.updateEventTitle(null, State.state.eventTitle);
        UI.renderTable();
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    }
}

export function handleUndo(refreshFullUICallback) {
    const previousState = History.undo(State.getState());
    if (previousState) { 
        State.restoreState(previousState); 
        refreshFullUICallback(); 
        Persistence.triggerAutoSave(); 
    }
}

export function handleRedo(refreshFullUICallback) {
    const nextState = History.redo(State.getState());
    if (nextState) { 
        State.restoreState(nextState); 
        refreshFullUICallback(); 
        Persistence.triggerAutoSave(); 
    }
}

export function handleSaveAndRecalculate(eventId, refreshFullUICallback) {
    History.saveToUndoHistory(State.getState());
    const editedInputs = document.querySelectorAll(`#editTable_${eventId} .editable-result`);
    const newResults = Array.from(editedInputs).map(input => ({ name: input.dataset.name, result: input.value }));
    State.updateEventResults(eventId, newResults);
    State.recalculateAllPoints(Competition.calculateEventPoints);
    refreshFullUICallback();
    UI.showNotification("Wyniki zostały przeliczone!", "success");
    History.saveToUndoHistory(State.getState());
    Persistence.triggerAutoSave();
}

export function handleStopwatchSave(competitorName, result, eventType) {
    const input = document.querySelector(`#resultsTable .resultInput[data-name="${CSS.escape(competitorName)}"]`);
    if (input) {
        History.saveToUndoHistory(State.getState());
        input.value = result;
        State.setEventType(eventType);
        UI.updateEventTypeButtons(eventType);
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
        UI.showNotification(`Zapisano wynik dla ${competitorName}.`, "success");
    }
}

export async function handleGenerateEventName() {
    if (!navigator.onLine) {
        return UI.showNotification("Funkcje AI wymagają połączenia z internetem.", "error");
    }
    const location = document.getElementById('eventLocationInput').value.trim();
    if (!location) return UI.showNotification("Wprowadź lokalizację.", "error");
    const prompt = `Zaproponuj 5 chwytliwych, kreatywnych nazw dla zawodów strongman odbywających się w: "${location}". Podaj tylko nazwy, każdą w nowej linii.`;
    const geminiModal = document.getElementById('geminiModal');
    const loading = document.getElementById('geminiLoading');
    const output = document.getElementById('geminiOutput');
    geminiModal.classList.add('visible'); loading.style.display = 'block'; output.innerHTML = '';
    const namesText = await GeminiAPI.callGemini(prompt);
    loading.style.display = 'none';
    if (namesText) {
        namesText.split('\n').filter(n => n.trim()).forEach(name => {
            const btn = document.createElement('button');
            btn.textContent = name.replace(/\"/g, "").replace(/\*/g, "").trim();
            btn.onclick = () => { document.getElementById('eventNameInput').value = btn.textContent; geminiModal.classList.remove('visible'); };
            output.appendChild(btn);
        });
    }
}

export async function handleGenerateAnnouncement() {
    if (!navigator.onLine) {
        return UI.showNotification("Funkcje AI wymagają połączenia z internetem.", "error");
    }
    const competitors = State.getActiveCompetitors();
    if (competitors.length === 0) return UI.showNotification("Rozpocznij zawody, aby wygenerować zapowiedź.", "error");
    const prompt = `Jesteś spikerem na zawodach strongman. Stwórz krótką, ekscytującą zapowiedź nadchodzącej konkurencji: "${document.getElementById('eventTitle').textContent}". Wymień kilku startujących zawodników, np.: ${competitors.slice(0,3).join(', ')}. Użyj dynamicznego języka.`;
    const geminiModal = document.getElementById('geminiModal');
    const loading = document.getElementById('geminiLoading');
    const output = document.getElementById('geminiOutput');
    geminiModal.classList.add('visible'); loading.style.display = 'block'; output.innerHTML = '';
    const announcement = await GeminiAPI.callGemini(prompt);
    loading.style.display = 'none';
    if (announcement) {
        output.innerHTML = `<textarea readonly>${announcement}</textarea>`;
    }
}

export async function handleManageCompetitors() {
    document.getElementById('competitorDbPanel').classList.add('visible');
    const competitors = await CompetitorDB.getCompetitors();
    UI.renderDbCompetitorList(competitors);
    const uniqueCategories = [...new Set(competitors.flatMap(c => c.categories || []))];
    UI.DOMElements.competitorCategories.innerHTML = uniqueCategories.map(cat => `
        <label><input type="checkbox" name="category" value="${cat}"> ${cat}</label>
    `).join('');
}

export async function handleCompetitorFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('competitorId').value;
    const photoFile = document.getElementById('competitorPhotoInput').files[0];
    let photoData = null;
    if (photoFile) photoData = await CompetitorDB.toBase64(photoFile);

    const competitorData = {
        name: document.getElementById('competitorNameInput').value.trim(),
        birthDate: document.getElementById('birthDateInput').value,
        residence: document.getElementById('residenceInput').value.trim(),
        height: document.getElementById('heightInput').value,
        weight: document.getElementById('weightInput').value,
        notes: document.getElementById('competitorNotesInput').value.trim(),
        categories: Array.from(document.querySelectorAll('#competitorCategories input:checked')).map(cb => cb.value),
    };
    if (id) competitorData.id = parseInt(id, 10);
    
    if (!photoData && id) {
        const existing = await CompetitorDB.getCompetitorById(parseInt(id, 10));
        if (existing) competitorData.photo = existing.photo;
    } else if (photoData) {
        competitorData.photo = photoData;
    }
    await CompetitorDB.saveCompetitor(competitorData);
    UI.showNotification(id ? 'Zawodnik zaktualizowany!' : 'Zawodnik dodany!', 'success');
    e.target.reset();
    document.getElementById('competitorId').value = '';
    document.getElementById('competitorFormBtn').textContent = 'Dodaj Zawodnika';
    await handleManageCompetitors();
    await loadAndRenderInitialData();
}

export async function handleCompetitorListAction(e) {
    const action = e.target.dataset.action;
    const id = parseInt(e.target.dataset.id, 10);
    if (!action || !id) return;
    if (action === 'edit-competitor') {
        const competitor = (await CompetitorDB.getCompetitors()).find(c => c.id === id);
        if(competitor) UI.populateCompetitorForm(competitor);
    } else if (action === 'delete-competitor') {
        if (await UI.showConfirmation("Czy na pewno usunąć tego zawodnika?")) {
            await CompetitorDB.deleteCompetitor(id);
            UI.showNotification('Zawodnik usunięty.', 'success');
            await handleManageCompetitors();
            await loadAndRenderInitialData();
        }
    }
}

export async function handleExportWord() {
    UI.showNotification("Generowanie pliku Word...", "info");
    if (!document.getElementById('finalSummaryPanel')) UI.renderFinalSummary();
    const summaryPanel = document.getElementById('finalSummaryPanel');
    if (!summaryPanel) return UI.showNotification("Najpierw wygeneruj podsumowanie.", "error");

    const logoSrc = State.getLogo();
    let logoHtml = '';
    if (logoSrc) {
        logoHtml = `<p style="text-align:center;"><img src="${logoSrc}" style="width:100%; max-width:600px; height:auto;"></p>`;
    }

    const eventName = document.getElementById('eventNameInput').value || 'Zawody Strongman';
    const location = document.getElementById('eventLocationInput').value;
    const eventHistory = State.getEventHistory();

    let eventsHtml = '';
    for (const event of eventHistory) {
        eventsHtml += `<h3>Konkurencja ${event.nr}: ${event.name}</h3>
        <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr>
                    <th style="border: 1px solid #999; padding: 8px; background-color: #f2f2f2;">Miejsce</th>
                    <th style="border: 1px solid #999; padding: 8px; background-color: #f2f2f2; text-align: left;">Zawodnik</th>
                    <th style="border: 1px solid #999; padding: 8px; background-color: #f2f2f2;">Wynik</th>
                    <th style="border: 1px solid #999; padding: 8px; background-color: #f2f2f2;">Pkt.</th>
                </tr>
            </thead>
            <tbody>
                ${event.results.sort((a,b) => a.place - b.place).map(res => `
                    <tr>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${res.place}</td>
                        <td style="border: 1px solid #999; padding: 8px;">${res.name}</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${res.result}</td>
                        <td style="border: 1px solid #999; padding: 8px; text-align: center;">${res.points}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>`;
    }
    
    const summaryClone = summaryPanel.cloneNode(true);
    summaryClone.querySelectorAll('img').forEach(img => img.remove());
    summaryClone.querySelectorAll('table').forEach(table => {
        table.setAttribute('width', '100%');
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';
        table.querySelectorAll('th, td').forEach(cell => {
            cell.style.border = '1px solid #999';
            cell.style.padding = '8px';
        });
        table.querySelectorAll('th').forEach(th => th.style.backgroundColor = '#f2f2f2');
    });


    let sourceHTML = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Wyniki</title></head>
        <body>
            ${logoHtml}
            <div style="text-align:center;">
                <h1>${eventName}</h1>
                <p>${location}</p>
            </div>
            ${summaryClone.innerHTML}
            <br pagebreak="true" />
            ${eventsHtml}
        </body>
        </html>`;

    const source = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    // --- POPRAWKA: Używamy rozszerzenia .docx, które pasuje do typu MIME ---
    fileDownload.download = `${State.state.eventName || 'wyniki'}.docx`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
}

export async function handleManageEvents() {
    document.getElementById('eventDbPanel').classList.add('visible');
    const events = await EventsDB.getEvents();
    UI.renderEventsList(events);
}

export async function handleEventFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('eventId').value;
    const eventData = {
        name: document.getElementById('eventNameDbInput').value.trim(),
        type: document.getElementById('eventTypeDbInput').value,
    };
    if (id) eventData.id = parseInt(id, 10);
    await EventsDB.saveEvent(eventData);
    UI.showNotification(id ? 'Konkurencja zaktualizowana!' : 'Konkurencja dodana!', 'success');
    e.target.reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventFormBtn').textContent = 'Dodaj Konkurencję';
    await handleManageEvents();
}

export async function handleEventListAction(e) {
    const action = e.target.dataset.action;
    const id = parseInt(e.target.dataset.id, 10);
    if (!action || !id) return;
    if (action === 'edit-event') {
        const event = (await EventsDB.getEvents()).find(ev => ev.id === id);
        if (event) UI.populateEventForm(event);
    } else if (action === 'delete-event') {
        if (await UI.showConfirmation("Czy na pewno usunąć tę konkurencję?")) {
            await EventsDB.deleteEvent(id);
            UI.showNotification('Konkurencja usunięta.', 'success');
            await handleManageEvents();
        }
    }
}

export async function handleSelectEventFromDb() {
    const events = await EventsDB.getEvents();
    if(events.length === 0) return UI.showNotification("Baza konkurencji jest pusta.", "info");
    UI.showSelectEventModal(events);
}

export async function handleEventSelection(e) {
    if (e.target.dataset.action !== 'select-event') return;
    const eventId = parseInt(e.target.dataset.id, 10);
    const events = await EventsDB.getEvents();
    const selectedEvent = events.find(ev => ev.id === eventId);
    if (selectedEvent) {
        History.saveToUndoHistory(State.getState());
        document.getElementById('eventTitle').textContent = selectedEvent.name;
        State.setEventType(selectedEvent.type);
        UI.updateEventTypeButtons(selectedEvent.type);
        document.getElementById('selectEventModal').classList.remove('visible');
        History.saveToUndoHistory(State.getState());
        Persistence.triggerAutoSave();
    }
}

export function handleExportPdf() {
    Persistence.exportToPdf();
}
