// Plik: js/state.js
// Cel: Centralny moduł zarządzania stanem aplikacji.

export const state = {
    competitors: [],
    scores: {},
    eventNumber: 1,
    eventHistory: [],
    logoData: null,
    currentEventType: 'high',
    competitorProfiles: {},
    allDbCompetitors: [],
    allDbEvents: [], 
    focusModeIndex: -1,
    eventName: '',
    eventLocation: '',
    eventTitle: 'Konkurencja 1',
};

export function getState() { return JSON.parse(JSON.stringify(state)); }
export function getAllDbCompetitors() { return state.allDbCompetitors; }
export function getCompetitorProfile(name) { return state.competitorProfiles[name]; }
export function getActiveCompetitors() { return state.competitors; }
export function getEventType() { return state.currentEventType; }
export function getEventHistory() { return state.eventHistory; }
export function getScores() { return state.scores; }
export function getEventNumber() { return state.eventNumber; }
export function getLogo() { return state.logoData; }
export function getAllDbEvents() { return state.allDbEvents; }

export function restoreState(loadedState) { Object.assign(state, loadedState); }

export function resetState() {
    state.competitors = [];
    state.scores = {};
    state.eventNumber = 1;
    state.eventHistory = [];
    state.currentEventType = 'high';
    state.focusModeIndex = -1;
    state.logoData = null;
    state.eventName = '';
    state.eventLocation = '';
    state.eventTitle = 'Konkurencja 1';
}

export function setAllDbCompetitors(dbCompetitors) {
    state.allDbCompetitors = dbCompetitors;
    state.competitorProfiles = {};
    dbCompetitors.forEach(c => { state.competitorProfiles[c.name] = c; });
}

export function setAllDbEvents(dbEvents) {
    state.allDbEvents = dbEvents;
}

export function startCompetition(selectedCompetitors) {
    state.competitors = selectedCompetitors;
    state.scores = {};
    selectedCompetitors.forEach(name => { state.scores[name] = 0; });
    state.eventNumber = 1;
    state.eventHistory = [];
}

export function setEventType(type) { state.currentEventType = type; }

export function nextEvent() {
    state.eventNumber++;
    state.eventTitle = `Konkurencja ${state.eventNumber}`;
    const lastEvent = state.eventHistory[state.eventHistory.length - 1];
    if (lastEvent) {
        const lastScores = {};
        lastEvent.results.forEach(res => { lastScores[res.name] = parseFloat(res.points); });
        state.competitors.sort((a, b) => (lastScores[a] || 0) - (lastScores[b] || 0));
    }
}

export function addEventToHistory(eventData) {
    state.eventHistory.push(eventData);
    eventData.results.forEach(res => {
        if (state.scores[res.name] !== undefined) {
            state.scores[res.name] += parseFloat(res.points);
        }
    });
}

export function setLogo(data) { state.logoData = data; }

export function shuffleCompetitors() {
    for (let i = state.competitors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.competitors[i], state.competitors[j]] = [state.competitors[j], state.competitors[i]];
    }
}

export function updateEventResults(eventId, newResults) {
    const eventToUpdate = state.eventHistory.find(e => e.nr === eventId);
    if (eventToUpdate) {
        const resultsMap = new Map(newResults.map(r => [r.name, r.result]));
        eventToUpdate.results.forEach(originalResult => {
            if (resultsMap.has(originalResult.name)) {
                originalResult.result = resultsMap.get(originalResult.name);
            }
        });
    }
}

export function recalculateAllPoints(calculateFn) {
    state.eventHistory.forEach(event => {
        const rawResults = event.results.map(r => ({ name: r.name, result: r.result }));
        const { results: recalculatedPoints } = calculateFn(rawResults, state.competitors.length, event.type);
        const pointsMap = new Map(recalculatedPoints.map(r => [r.name, { points: r.points, place: r.place }]));
        event.results.forEach(originalResult => {
            if (pointsMap.has(originalResult.name)) {
                const { points, place } = pointsMap.get(originalResult.name);
                originalResult.points = points;
                originalResult.place = place;
            }
        });
    });

    Object.keys(state.scores).forEach(name => state.scores[name] = 0);
    state.eventHistory.forEach(event => {
        event.results.forEach(result => {
            if (state.scores[result.name] !== undefined) {
                state.scores[result.name] += parseFloat(result.points);
            }
        });
    });
}
