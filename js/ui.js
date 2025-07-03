// Plik: js/ui.js
// Cel: Odpowiada za wszystkie interakcje z DOM.

import { getActiveCompetitors, getScores, getCompetitorProfile, getEventHistory } from './state.js';
import { breakTie } from './competition.js';

export let DOMElements = {};

export function initUI() {
    DOMElements = {
        notificationBar: document.getElementById('notification-bar'),
        confirmationModal: document.getElementById('confirmationModal'),
        modalText: document.getElementById('modalText'),
        confirmBtn: document.getElementById('confirmBtn'),
        cancelBtn: document.getElementById('cancelBtn'),
        promptModal: document.getElementById('promptModal'),
        promptText: document.getElementById('promptText'),
        promptInput: document.getElementById('promptInput'),
        promptConfirmBtn: document.getElementById('promptConfirmBtn'),
        promptCancelBtn: document.getElementById('promptCancelBtn'),
        introView: document.getElementById('intro'),
        mainContentView: document.getElementById('mainContent'),
        resultsTableBody: document.querySelector("#resultsTable tbody"),
        categoryFilters: document.getElementById('categoryFilters'),
        competitorSelectionList: document.getElementById('competitorSelectionList'),
        selectionCounter: document.getElementById('selectionCounter'),
        competitorDetailModal: document.getElementById('competitorDetailModal'),
        competitorDetailName: document.getElementById('competitorDetailName'),
        competitorDetailPhoto: document.getElementById('competitorDetailPhoto'),
        competitorDetailMeta: document.getElementById('competitorDetailMeta'),
        competitorDetailNotes: document.getElementById('competitorDetailNotes'),
        historyPanel: document.getElementById('historyPanel'),
        eventList: document.getElementById('eventList'),
        eventDetails: document.getElementById('eventDetails'),
        eventTitle: document.getElementById('eventTitle'),
        highTypeBtn: document.getElementById('highTypeBtn'),
        lowTypeBtn: document.getElementById('lowTypeBtn'),
        competitorForm: document.getElementById('competitorForm'),
        competitorFormBtn: document.getElementById('competitorFormBtn'),
        competitorId: document.getElementById('competitorId'),
        competitorNameInput: document.getElementById('competitorNameInput'),
        birthDateInput: document.getElementById('birthDateInput'),
        residenceInput: document.getElementById('residenceInput'),
        heightInput: document.getElementById('heightInput'),
        weightInput: document.getElementById('weightInput'),
        competitorCategories: document.getElementById('competitorCategories'),
        competitorNotesInput: document.getElementById('competitorNotesInput'),
        competitorListContainer: document.getElementById('competitorListContainer'),
        eventDbPanel: document.getElementById('eventDbPanel'),
        eventForm: document.getElementById('eventForm'),
        eventFormBtn: document.getElementById('eventFormBtn'),
        eventId: document.getElementById('eventId'),
        eventNameDbInput: document.getElementById('eventNameDbInput'),
        eventTypeDbInput: document.getElementById('eventTypeDbInput'),
        eventListContainer: document.getElementById('eventListContainer'),
        selectEventModal: document.getElementById('selectEventModal'),
        selectEventList: document.getElementById('selectEventList'),
        checkpointListContainer: document.getElementById('checkpointListContainer'),
        checkpointList: document.getElementById('checkpointList'),
        storageUsage: document.getElementById('storageUsage'),
        focusModeModal: document.getElementById('focusModeModal'),
        focusCompetitorPhoto: document.getElementById('focusCompetitorPhoto'),
        focusCompetitorName: document.getElementById('focusCompetitorName'),
        focusResultInput: document.getElementById('focusResultInput'),
        eventNameInput: document.getElementById('eventNameInput'),
        eventLocationInput: document.getElementById('eventLocationInput'),
        themeSelector: document.getElementById('themeSelector'),
    };
}

export function calculateAge(birthDateString) {
    if (!birthDateString) return null;
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export function showNotification(message, type = 'success', duration = 3000) {
    if (!DOMElements.notificationBar) return;
    const bar = DOMElements.notificationBar;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    bar.innerHTML = `${icons[type] || ''} ${message}`;
    bar.className = type;
    bar.classList.add('show');
    setTimeout(() => bar.classList.remove('show'), duration);
}

export function showConfirmation(message) {
    return new Promise((resolve) => {
        const modal = DOMElements.confirmationModal;
        DOMElements.modalText.textContent = message;
        modal.classList.add('visible');
        
        const newConfirmBtn = DOMElements.confirmBtn.cloneNode(true);
        DOMElements.confirmBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.confirmBtn);
        DOMElements.confirmBtn = newConfirmBtn;

        const newCancelBtn = DOMElements.cancelBtn.cloneNode(true);
        DOMElements.cancelBtn.parentNode.replaceChild(newCancelBtn, DOMElements.cancelBtn);
        DOMElements.cancelBtn = newCancelBtn;

        const close = (value) => { modal.classList.remove('visible'); resolve(value); };
        newConfirmBtn.onclick = () => close(true);
        newCancelBtn.onclick = () => close(false);
    });
}

export function showPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = DOMElements.promptModal;
        DOMElements.promptText.textContent = message;
        DOMElements.promptInput.value = defaultValue;
        modal.classList.add('visible');
        DOMElements.promptInput.focus();
        DOMElements.promptInput.select();

        const newConfirmBtn = DOMElements.promptConfirmBtn.cloneNode(true);
        DOMElements.promptConfirmBtn.parentNode.replaceChild(newConfirmBtn, DOMElements.promptConfirmBtn);
        DOMElements.promptConfirmBtn = newConfirmBtn;

        const newCancelBtn = DOMElements.promptCancelBtn.cloneNode(true);
        DOMElements.promptCancelBtn.parentNode.replaceChild(newCancelBtn, DOMElements.promptCancelBtn);
        DOMElements.promptCancelBtn = newCancelBtn;

        const close = (value) => {
            modal.classList.remove('visible');
            resolve(value);
        };

        newConfirmBtn.onclick = () => close(DOMElements.promptInput.value);
        newCancelBtn.onclick = () => close(null);
    });
}

export function showCompetitorDetails(profile) {
    if (!profile) return;
    const age = calculateAge(profile.birthDate);
    const categoriesText = (profile.categories && profile.categories.length > 0) ? profile.categories.join(', ') : 'Brak';
    
    DOMElements.competitorDetailName.textContent = profile.name;
    DOMElements.competitorDetailPhoto.src = profile.photo || 'https://placehold.co/150x150/eee/333?text=?';
    DOMElements.competitorDetailMeta.innerHTML = `
        <p><strong>Wiek:</strong> ${age ? age + ' lat' : 'Brak danych'}</p>
        <p><strong>Wzrost:</strong> ${profile.height ? profile.height + ' cm' : 'Brak danych'}</p>
        <p><strong>Waga:</strong> ${profile.weight ? profile.weight + ' kg' : 'Brak danych'}</p>
        <p><strong>Zamieszkanie:</strong> ${profile.residence || 'Brak danych'}</p>
        <p><strong>Kategorie:</strong> ${categoriesText}</p>
    `;
    DOMElements.competitorDetailNotes.textContent = profile.notes || 'Brak dodatkowych informacji.';
    DOMElements.competitorDetailModal.classList.add('visible');
}

export function switchView(viewName) {
    DOMElements.introView.style.display = viewName === 'intro' ? 'block' : 'none';
    DOMElements.mainContentView.style.display = viewName === 'main' ? 'block' : 'none';
}

export function renderTable() {
    const competitors = getActiveCompetitors();
    const scores = getScores();
    const tbody = DOMElements.resultsTableBody;
    tbody.innerHTML = competitors.map(name => {
        const profile = getCompetitorProfile(name) || {};
        return `
            <tr data-name="${name}">
                <td>
                    <div class="competitor-cell">
                        <img src="${profile.photo || 'https://placehold.co/40x40/eee/333?text=?'}" class="competitor-photo-thumb" alt="${name}" data-action="openStopwatch" title="Uruchom stoper dla ${name}">
                        <span>${name}</span>
                        <span class="info-icon" data-action="showDetails" aria-label="Pokaż szczegóły zawodnika">ℹ️</span>
                    </div>
                </td>
                <td class="result-cell"><input class="resultInput" data-name="${name}" type="text" inputmode="decimal" /></td>
                <td data-type="place">-</td>
                <td data-type="points">0.00</td>
                <td data-type="sum">${(scores[name] || 0).toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

export function updateTableWithEventData(eventResults) {
    const scores = getScores();
    eventResults.forEach(res => {
        const row = DOMElements.resultsTableBody.querySelector(`tr[data-name="${CSS.escape(res.name)}"]`);
        if (row) {
            row.querySelector('.resultInput').value = res.result;
            row.querySelector('td[data-type="place"]').textContent = res.place;
            row.querySelector('td[data-type="points"]').textContent = res.points;
            row.querySelector('td[data-type="sum"]').textContent = (scores[res.name] || 0).toFixed(2);
        }
    });
}

export function lockResultInputs() {
    DOMElements.resultsTableBody.querySelectorAll('.resultInput').forEach(input => input.readOnly = true);
}

export function updateEventTitle(number, overrideTitle = null) {
    const title = overrideTitle ? overrideTitle : `Konkurencja ${number}`;
    DOMElements.eventTitle.textContent = title;
}

export function updateEventTypeButtons(type) {
    DOMElements.highTypeBtn.classList.toggle('active', type === 'high');
    DOMElements.lowTypeBtn.classList.toggle('active', type === 'low');
}

export function renderCompetitorSelectionUI(allCompetitors) {
    const uniqueCategories = [...new Set(allCompetitors.flatMap(c => c.categories || []))];
    
    DOMElements.categoryFilters.innerHTML = '<button class="filter-btn active" data-filter="all">Wszyscy</button>';
    uniqueCategories.forEach(cat => {
        DOMElements.categoryFilters.innerHTML += `<button class="filter-btn" data-filter="${cat}">${cat}</button>`;
    });
    
    DOMElements.competitorCategories.innerHTML = uniqueCategories.map(cat => `
        <label><input type="checkbox" name="category" value="${cat}"> ${cat}</label>
    `).join('') + `<label><input type="checkbox" name="category" value="Nowa Kategoria"> Nowa Kategoria</label>`;


    if (allCompetitors.length === 0) {
        DOMElements.competitorSelectionList.innerHTML = `<p style="text-align:center; padding: 20px;">Baza danych jest pusta. Kliknij "Zarządzaj Zawodnikami", aby dodać pierwszych uczestników.</p>`;
        return;
    }
    DOMElements.competitorSelectionList.innerHTML = allCompetitors.map(c => {
        const categoriesStr = (c.categories && c.categories.length) ? c.categories.join(',') : '';
        return `
            <label class="competitor-select-item" data-categories="${categoriesStr}">
              <input type="checkbox" value="${c.name}">
              <img src="${c.photo || 'https://placehold.co/40x40/eee/333?text=?'}" class="competitor-photo-thumb">
              <span>${c.name}</span>
            </label>
        `;
    }).join('');
}

export function updateSelectionCounter(count) {
    DOMElements.selectionCounter.textContent = `Wybrano: ${count}`;
}

export function filterCompetitorSelectionList(filter) {
    document.querySelectorAll('#categoryFilters .filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    document.querySelectorAll('#competitorSelectionList .competitor-select-item').forEach(item => {
        const itemCategories = item.dataset.categories ? item.dataset.categories.split(',') : [];
        item.style.display = (filter === 'all' || itemCategories.includes(filter)) ? 'flex' : 'none';
    });
}

export function setLogoUI(data) {
    const logoImg = document.getElementById('logoImg');
    const selectLogoBtn = document.getElementById('selectLogoBtn');
    if (data) {
        logoImg.src = data;
        selectLogoBtn.style.display = 'none';
    } else {
        logoImg.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzJjM2U1MCIgd2lkdGg9IjE1MHB4IiBoZWlnaHQ9IjE1MHB4Ij48cGF0aCBkPSJNMjIgMTJoLTJ2LTJoLTJ2LTJoLTJ2Mkg4di0ySDZ2MkgydjJoMlYxNGgydjJoMnYyaDJ2LTJoMnYtMmgydjJoMnYtMmgydjJoMnYtMmgydi0yaC0yem0tMTAgNmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDJzLS45IDItMiAyetTTE2IDhjMCAxLjEtLjkgMi0yIDJoLTRjLTEuMSAwLTItLjktMi0yVjZoMHYyYzAgLjU1LjQ1IDEgMSAxczEtLjQ1IDEtMVY2aDJ2MmMwIC41NS40NSAxIDEgMXMxLS40NSAxLTFWNmgwdjJ6Ii8+PC9zdmc+"; // Default logo
        selectLogoBtn.style.display = '';
    }
}

export function toggleHistoryPanel() {
    const panel = DOMElements.historyPanel;
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        const history = getEventHistory();
        const list = DOMElements.eventList;
        list.innerHTML = "";
        history.forEach(event => {
            const btn = document.createElement("button");
            btn.textContent = `Edytuj Konkurencję ${event.nr}: ${event.name}`;
            btn.dataset.eventId = event.nr;
            list.appendChild(btn);
        });
        DOMElements.eventDetails.innerHTML = history.length > 0 ?
            '<p style="text-align:center;">Wybierz konkurencję do edycji.</p>' :
            '<p style="text-align:center;">Brak zakończonych konkurencji.</p>';
    }
}

export function renderEventForEditing(eventId) {
    const eventToEdit = getEventHistory().find(e => e.nr === eventId);
    if (!eventToEdit) return;
    const details = DOMElements.eventDetails;
    let html = `<h4>Edycja: ${eventToEdit.name}</h4><table id="editTable_${eventId}"><thead><tr><th>Zawodnik</th><th>Wynik</th></tr></thead><tbody>`;
    eventToEdit.results.forEach(w => {
        html += `<tr><td>${w.name}</td><td><input class="editable-result" data-name="${w.name}" value="${w.result}" type="text" inputmode="decimal"></td></tr>`;
    });
    html += `</tbody></table><button data-action="save-recalculate" data-event-id="${eventId}">Zapisz i Przelicz</button>`;
    details.innerHTML = html;
}

export function renderFinalSummary() {
    const existingPanel = document.getElementById('finalSummaryPanel');
    if (existingPanel) existingPanel.remove();
    const competitors = getActiveCompetitors();
    const scores = getScores();
    const eventHistory = getEventHistory();
    const finalStandings = [...competitors].sort((a, b) => {
        const scoreDiff = (scores[b] || 0) - (scores[a] || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return breakTie(a, b, eventHistory, competitors.length).outcome;
    });
    let standingsData = finalStandings.map(name => ({
        name: name,
        score: (scores[name] || 0).toFixed(2),
        tieInfo: ''
    }));
    for (let i = 0; i < standingsData.length - 1; i++) {
        if (standingsData[i].score === standingsData[i+1].score) {
            const tieResult = breakTie(standingsData[i].name, standingsData[i+1].name, eventHistory, competitors.length);
            if (tieResult.reason !== "Remis nierozstrzygnięty") {
                 standingsData[i].tieInfo = `<span class="tie-info" tabindex="0" title="${tieResult.reason}">(i)<span class="tooltip">Wygrana przez: ${tieResult.reason}</span></span>`;
            }
        }
    }
    let html = `<h3>Klasyfikacja Końcowa</h3><div class="table-wrapper"><table><thead><tr><th>Miejsce</th><th>Zawodnik</th><th>Suma</th></tr></thead><tbody>`;
    standingsData.forEach((data, i) => {
        const currentPlace = i + 1;
        const medalClass = currentPlace === 1 ? "gold" : currentPlace === 2 ? "silver" : currentPlace === 3 ? "bronze" : "";
        const profile = getCompetitorProfile(data.name) || {};
        html += `<tr class="${medalClass}"><td>${currentPlace}</td><td><div class="competitor-cell"><img src="${profile.photo || 'https://placehold.co/40x40/eee/333?text=?'}" class="competitor-photo-thumb" alt="${data.name}"><span>${data.name} ${data.tieInfo}</span></div></td><td>${data.score}</td></tr>`;
    });
    html += `</tbody></table></div>`;
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'finalSummaryPanel';
    panel.innerHTML = html;
    DOMElements.mainContentView.appendChild(panel);
    panel.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

export function populateCompetitorForm(competitor) {
    DOMElements.competitorForm.reset();
    DOMElements.competitorId.value = competitor.id;
    DOMElements.competitorNameInput.value = competitor.name;
    DOMElements.birthDateInput.value = competitor.birthDate || '';
    DOMElements.residenceInput.value = competitor.residence || '';
    DOMElements.heightInput.value = competitor.height || '';
    DOMElements.weightInput.value = competitor.weight || '';
    DOMElements.competitorNotesInput.value = competitor.notes || '';
    document.querySelectorAll('#competitorCategories input').forEach(cb => {
        cb.checked = competitor.categories?.includes(cb.value) || false;
    });
    DOMElements.competitorFormBtn.textContent = 'Zapisz Zmiany';
}

export function renderDbCompetitorList(competitors) {
    const container = DOMElements.competitorListContainer;
    if (!container) return;
    container.innerHTML = competitors.map(c => `
        <div class="competitor-list-item">
            <span>${c.name}</span>
            <div class="competitor-list-actions">
                <button data-action="edit-competitor" data-id="${c.id}">Edytuj</button>
                <button data-action="delete-competitor" data-id="${c.id}" style="background:var(--error-color);">Usuń</button>
            </div>
        </div>
    `).join('');
}

export function renderEventsList(events) {
    const container = DOMElements.eventListContainer;
    if (!container) return;
    container.innerHTML = events.map(e => `
        <div class="competitor-list-item">
            <span>${e.name} (${e.type === 'high' ? 'Więcej=L' : 'Mniej=L'})</span>
            <div class="competitor-list-actions">
                 <button data-action="edit-event" data-id="${e.id}">Edytuj</button>
                 <button data-action="delete-event" data-id="${e.id}" style="background:var(--error-color);">Usuń</button>
            </div>
        </div>
    `).join('');
}

export function populateEventForm(event) {
    DOMElements.eventForm.reset();
    DOMElements.eventId.value = event.id;
    DOMElements.eventNameDbInput.value = event.name;
    DOMElements.eventTypeDbInput.value = event.type;
    DOMElements.eventFormBtn.textContent = 'Zapisz Zmiany';
}

export function showSelectEventModal(events) {
    const list = DOMElements.selectEventList;
    list.innerHTML = events.map(e => `
        <div class="lap-item" data-action="select-event" data-id="${e.id}">
            ${e.name}
        </div>
    `).join('');
    DOMElements.selectEventModal.classList.add('visible');
}
