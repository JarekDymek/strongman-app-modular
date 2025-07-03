// Plik: js/competition.js
// Cel: Zawiera czystą logikę biznesową związaną z punktacją i zasadami zawodów.

import { showConfirmation } from './ui.js';
import { getState, state } from './state.js';
import { saveToUndoHistory } from './history.js';

export function parseResult(rawValue, eventType) {
    const valStr = String(rawValue).trim().replace(',', '.').toLowerCase();
    const worstVal = eventType === 'high' ? -Infinity : +Infinity;

    if (valStr === "" || valStr === "0") {
        return { val: worstVal, raw: rawValue, zero: true };
    }

    if (eventType === 'low') {
        if (valStr.startsWith('0') && valStr.length > 1 && !valStr.startsWith('0.')) {
            const distance = parseFloat(valStr);
            if (isNaN(distance)) {
                return { val: worstVal, raw: rawValue, zero: true };
            }
            return { val: 10000 - distance, raw: rawValue, zero: false };
        }
        if (valStr.includes(':')) {
            const parts = valStr.split(':');
            const minutes = parseFloat(parts[0]) * 60;
            const seconds = parseFloat(parts[1]);
            if (!isNaN(minutes) && !isNaN(seconds)) {
                 return { val: minutes + seconds, raw: rawValue, zero: false };
            }
        }
        const time = parseFloat(valStr);
        if (isNaN(time)) {
             return { val: worstVal, raw: rawValue, zero: true };
        }
        return { val: time, raw: rawValue, zero: false };
    }
    
    if (eventType === 'high') {
        const score = parseFloat(valStr);
        if (isNaN(score)) {
            return { val: worstVal, raw: rawValue, zero: true };
        }
        return { val: score, raw: rawValue, zero: false };
    }
    
    return { val: worstVal, raw: rawValue, zero: true };
}

export function calculateEventPoints(currentResults, totalCompetitors, eventType) {
    let hasError = false;

    const parsedResults = currentResults.map(entry => {
        const parsed = parseResult(entry.result, eventType);
        parsed.name = entry.name;
        if (parsed.zero && parsed.raw !== "" && parsed.raw !== "0") {
            hasError = true;
        }
        return parsed;
    });

    if (hasError) {
        return { results: [], error: true };
    }

    parsedResults.sort((a, b) => eventType === 'high' ? b.val - a.val : a.val - b.val);

    let finalEventResults = [];
    for (let i = 0; i < parsedResults.length; ) {
        let j = i;
        while (j < parsedResults.length && parsedResults[j].val === parsedResults[i].val) {
            j++;
        }
        const tiedCount = j - i;
        let sumOfPoints = 0;
        for (let k = i; k < j; k++) {
            if (!parsedResults[k].zero) {
                sumOfPoints += (totalCompetitors - k);
            }
        }
        const averagePoints = tiedCount > 0 ? sumOfPoints / tiedCount : 0;
        for (let k = i; k < j; k++) {
            finalEventResults.push({
                name: parsedResults[k].name,
                result: parsedResults[k].raw,
                place: parsedResults[k].zero ? "-" : (i + 1),
                points: (parsedResults[k].zero ? 0 : averagePoints).toFixed(2)
            });
        }
        i = j;
    }
    return { results: finalEventResults, error: false };
}

export function breakTie(competitorA, competitorB, eventHistory, totalCompetitors) {
    const countPlaces = (name) => {
        const places = Array(totalCompetitors + 1).fill(0);
        eventHistory.forEach(e => {
            const result = e.results.find(w => w.name === name);
            if (result && result.place !== "-") {
                const place = parseInt(result.place);
                if (!isNaN(place)) places[place]++;
            }
        });
        return places;
    };

    const aPlaces = countPlaces(competitorA);
    const bPlaces = countPlaces(competitorB);

    for (let i = 1; i <= totalCompetitors; i++) {
        if (aPlaces[i] !== bPlaces[i]) {
            return { outcome: bPlaces[i] - aPlaces[i], reason: `więcej ${i}. miejsc` };
        }
    }

    const lastEvent = eventHistory[eventHistory.length - 1];
    if (lastEvent) {
        const aResult = lastEvent.results.find(r => r.name === competitorA);
        const bResult = lastEvent.results.find(r => r.name === competitorB);
        if (aResult && bResult && aResult.points !== bResult.points) {
            return { outcome: parseFloat(bResult.points) - parseFloat(aResult.points), reason: `lepszy wynik w ostatniej konkurencji` };
        }
    }

    return { outcome: 0, reason: "Remis nierozstrzygnięty" };
}

export async function setupFinalEvent(tieBreaker) {
    const inputs = document.querySelectorAll('#resultsTable .resultInput:not([readonly])');
    if (inputs.length > 0 && !await showConfirmation("Nie przyznano punktów dla bieżącej konkurencji. Czy na pewno chcesz kontynuować?")) {
        return false;
    }
    saveToUndoHistory(getState());
    state.eventNumber++;
    state.eventTitle = `Konkurencja ${state.eventNumber} (FINAŁ)`;
    state.competitors.sort((a, b) => {
        const scoreDiff = (state.scores[b] || 0) - (state.scores[a] || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return tieBreaker(a, b, state.eventHistory, state.competitors.length).outcome;
    }).reverse();
    return true;
}
