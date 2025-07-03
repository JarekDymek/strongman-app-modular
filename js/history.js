// Plik: js/history.js
// Cel: Zarządza stosami Undo/Redo.

let undoStack = [];
let redoStack = [];
const MAX_HISTORY_SIZE = 50; 

export function saveToUndoHistory(currentState) {
    if (undoStack.length > 0 && JSON.stringify(undoStack[undoStack.length - 1]) === JSON.stringify(currentState)) {
        return;
    }
    redoStack = [];
    document.getElementById('redoBtn').disabled = true;
    undoStack.push(JSON.parse(JSON.stringify(currentState)));
    if (undoStack.length > MAX_HISTORY_SIZE) {
        undoStack.shift();
    }
    document.getElementById('undoBtn').disabled = undoStack.length === 0;
}

export function undo(currentState) {
    if (undoStack.length === 0) return null;
    redoStack.push(JSON.parse(JSON.stringify(currentState)));
    document.getElementById('redoBtn').disabled = false;
    const previousState = undoStack.pop();
    document.getElementById('undoBtn').disabled = undoStack.length === 0;
    return previousState;
}

export function redo(currentState) {
    if (redoStack.length === 0) return null;
    undoStack.push(JSON.parse(JSON.stringify(currentState)));
    document.getElementById('undoBtn').disabled = false;
    const nextState = redoStack.pop();
    document.getElementById('redoBtn').disabled = redoStack.length === 0;
    return nextState;
}

export function clearHistory() {
    undoStack = [];
    redoStack = [];
    document.getElementById('undoBtn').disabled = true;
    document.getElementById('redoBtn').disabled = true;
}
