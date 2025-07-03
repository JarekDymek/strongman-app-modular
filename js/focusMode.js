// Plik: js/focusMode.js
// Cel: Cała logika Trybu Skupienia.

import { state, getActiveCompetitors, getCompetitorProfile } from './state.js';
import { DOMElements } from './ui.js';
import { saveToUndoHistory } from './history.js';
import { triggerAutoSave } from './persistence.js';
import { getState } from './state.js';

export function setupFocusModeEventListeners() {
    document.getElementById('closeFocusBtn').addEventListener('click', handleCloseFocusMode);
    document.getElementById('focusPrevBtn').addEventListener('click', () => handleFocusNavigate(-1));
    document.getElementById('focusNextBtn').addEventListener('click', () => handleFocusNavigate(1));
    document.getElementById('focusConfirmNextBtn').addEventListener('click', handleFocusConfirmAndNext);
    DOMElements.focusResultInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleFocusConfirmAndNext();
        }
    });
}

export function handleEnterFocusMode(competitorName) {
    const competitors = getActiveCompetitors();
    const index = competitors.findIndex(c => c === competitorName);
    if (index === -1) return;
    
    state.focusModeIndex = index;
    renderFocusMode();
    DOMElements.focusModeModal.classList.add('visible');
    DOMElements.focusResultInput.focus();
    DOMElements.focusResultInput.select();
}

function renderFocusMode() {
    if (state.focusModeIndex === -1) return;

    const competitors = getActiveCompetitors();
    const competitorName = competitors[state.focusModeIndex];
    const profile = getCompetitorProfile(competitorName) || {};
    const resultInput = document.querySelector(`#resultsTable .resultInput[data-name="${CSS.escape(competitorName)}"]`);
    const confirmBtn = document.getElementById('focusConfirmNextBtn');

    DOMElements.focusCompetitorName.textContent = competitorName;
    DOMElements.focusCompetitorPhoto.src = profile.photo || 'https://placehold.co/120x120/eee/333?text=?';
    DOMElements.focusResultInput.value = resultInput ? resultInput.value : '';

    const isLastCompetitor = state.focusModeIndex === competitors.length - 1;
    document.getElementById('focusPrevBtn').disabled = state.focusModeIndex === 0;
    document.getElementById('focusNextBtn').disabled = isLastCompetitor;
    
    if (isLastCompetitor) {
        confirmBtn.textContent = 'Zatwierdź i Zamknij';
    } else {
        confirmBtn.textContent = 'Zatwierdź i Następny';
    }
}

function handleCloseFocusMode() {
    DOMElements.focusModeModal.classList.remove('visible');
    state.focusModeIndex = -1;
}

function handleFocusNavigate(direction) {
    const newIndex = state.focusModeIndex + direction;
    const competitors = getActiveCompetitors();
    if (newIndex >= 0 && newIndex < competitors.length) {
        state.focusModeIndex = newIndex;
        renderFocusMode();
        DOMElements.focusResultInput.focus();
        DOMElements.focusResultInput.select();
    }
}

function handleFocusConfirmAndNext() {
    if (state.focusModeIndex > -1) {
        const competitorName = getActiveCompetitors()[state.focusModeIndex];
        const mainTableInput = document.querySelector(`#resultsTable .resultInput[data-name="${CSS.escape(competitorName)}"]`);
        if (mainTableInput) {
            const newResult = DOMElements.focusResultInput.value;
            if (mainTableInput.value !== newResult) {
                saveToUndoHistory(getState());
                mainTableInput.value = newResult;
                triggerAutoSave();
            }
        }
    }
    
    const isLastCompetitor = state.focusModeIndex === getActiveCompetitors().length - 1;
    if (isLastCompetitor) {
        handleCloseFocusMode();
    } else {
        handleFocusNavigate(1);
    }
}
