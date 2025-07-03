// Plik: js/stopwatch.js
// Cel: Cała logika pełnoekranowego stopera.

import { getCompetitorProfile } from './state.js';
import { showNotification } from './ui.js';

let stopwatchDOMElements = {};
let interval, startTime, elapsedTime = 0, isRunning = false, currentCompetitor, mode, repCount = 0, lapTimes = [], onSaveCallback;

export function initStopwatch() {
    stopwatchDOMElements = {
        stopwatchEl: document.getElementById('fullscreenStopwatch'),
        timeDisplay: document.getElementById('fsTime'),
        nameDisplay: document.getElementById('fsCompetitorName'),
        photoDisplay: document.getElementById('fsCompetitorPhoto'),
        startStopBtn: document.getElementById('fsStartStopBtn'),
        postStopControls: document.getElementById('fsPostStopControls'),
        repsBtn: document.getElementById('fsRepsBtn'),
        lapsBtn: document.getElementById('fsLapsBtn'),
        lapsModal: document.getElementById('fsLapsModal'),
        lapsModalList: document.getElementById('fsLapsModalList'),
        resetBtn: document.getElementById('fsResetBtn'),
        saveBtn: document.getElementById('fsSaveBtn'),
        exitBtn: document.getElementById('fsExitBtn'),
        displayArea: document.getElementById('fsDisplayArea'),
        lapsCancelBtn: document.getElementById('fsLapsCancelBtn'),
        fsModeSelection: document.getElementById('fsModeSelection'),
    };
}

function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function updateDisplay() {
    elapsedTime = Date.now() - startTime;
    stopwatchDOMElements.timeDisplay.textContent = formatTime(elapsedTime);
}

function startStopwatchTimer() {
    if (isRunning) return;
    if (!mode || mode === 'none') {
        showNotification("Najpierw wybierz tryb: Powtórzenia lub Międzyczasy.", "error");
        return;
    }
    isRunning = true;
    startTime = Date.now() - elapsedTime;
    interval = setInterval(updateDisplay, 10);
    stopwatchDOMElements.startStopBtn.textContent = 'Stop';
    stopwatchDOMElements.startStopBtn.classList.add('stop-state');
    stopwatchDOMElements.fsModeSelection.style.display = 'none';
    stopwatchDOMElements.startStopBtn.style.display = 'flex';
}

function stopStopwatchTimer() {
    if (!isRunning) return;
    isRunning = false;
    clearInterval(interval);
    updateDisplay();
    stopwatchDOMElements.startStopBtn.style.display = 'none';
    stopwatchDOMElements.postStopControls.style.display = 'grid';
    if (mode === 'laps' && lapTimes.length > 0) {
        showLapSelectionModal();
    }
}

function resetStopwatch() {
  if(isRunning) { clearInterval(interval); isRunning = false; }
  elapsedTime = 0; repCount = 0; lapTimes = []; mode = 'none';
  stopwatchDOMElements.timeDisplay.textContent = formatTime(0);
  stopwatchDOMElements.startStopBtn.textContent = 'Start';
  stopwatchDOMElements.startStopBtn.classList.remove('stop-state');
  stopwatchDOMElements.startStopBtn.style.display = 'flex';
  stopwatchDOMElements.postStopControls.style.display = 'none';
  stopwatchDOMElements.fsModeSelection.style.display = 'grid';
  stopwatchDOMElements.stopwatchEl.classList.remove('mode-selected');
  stopwatchDOMElements.repsBtn.classList.remove('selected');
  stopwatchDOMElements.lapsBtn.classList.remove('selected');
}

function handleModeAction() {
  if(!isRunning) return;
  if (mode === 'reps') {
      repCount++;
      stopwatchDOMElements.startStopBtn.textContent = `${repCount} Powt.`;
  } else if (mode === 'laps') {
      const currentLap = elapsedTime;
      lapTimes.push(currentLap);
      const lastLapTime = lapTimes.length > 1 ? currentLap - lapTimes[lapTimes.length - 2] : currentLap;
      stopwatchDOMElements.startStopBtn.textContent = formatTime(lastLapTime);
      showNotification(`Międzyczas ${lapTimes.length}: ${formatTime(currentLap)}`, 'info', 1500);
  }
}

function setStopwatchMode(selectedMode) {
  if(isRunning) return;
  mode = selectedMode;
  stopwatchDOMElements.stopwatchEl.classList.add('mode-selected');
  stopwatchDOMElements.repsBtn.classList.toggle('selected', mode === 'reps');
  stopwatchDOMElements.lapsBtn.classList.toggle('selected', mode === 'laps');
}

function showLapSelectionModal() {
  stopwatchDOMElements.lapsModalList.innerHTML = '';
  lapTimes.forEach((lap, index) => {
      const item = document.createElement('div');
      item.className = 'lap-item';
      item.textContent = `${index + 1}. ${formatTime(lap)}`;
      item.onclick = () => {
          saveStopwatchResult(lap);
          stopwatchDOMElements.lapsModal.classList.remove('visible');
      };
      stopwatchDOMElements.lapsModalList.appendChild(item);
  });
  stopwatchDOMElements.lapsModal.classList.add('visible');
}

function saveStopwatchResult(valueToSave = null) {
    if (onSaveCallback) {
        let result, eventType;
        switch(mode) {
            case 'reps': result = repCount; eventType = 'high'; break;
            case 'laps': result = (valueToSave / 1000).toFixed(2); eventType = 'low'; break;
            default: result = (elapsedTime / 1000).toFixed(2); eventType = 'low'; break;
        }
        onSaveCallback(currentCompetitor, result, eventType);
    }
    exitStopwatch();
}

function exitStopwatch() {
    if (document.fullscreenElement) { document.exitFullscreen(); }
    stopwatchDOMElements.stopwatchEl.classList.remove('visible');
}

export function enterStopwatch(competitorName, saveCallback) {
    onSaveCallback = saveCallback;
    currentCompetitor = competitorName;
    const profile = getCompetitorProfile(competitorName) || {};
    stopwatchDOMElements.nameDisplay.textContent = competitorName;
    stopwatchDOMElements.photoDisplay.src = profile.photo || 'https://placehold.co/120x120/eee/333?text=?';
    resetStopwatch();
    try {
        if (document.fullscreenEnabled) stopwatchDOMElements.stopwatchEl.requestFullscreen();
    } catch(err) { /* ignore */ }
    stopwatchDOMElements.stopwatchEl.classList.add('visible');
}

export function setupStopwatchEventListeners() {
    stopwatchDOMElements.startStopBtn.addEventListener('click', () => isRunning ? stopStopwatchTimer() : startStopwatchTimer());
    stopwatchDOMElements.displayArea.addEventListener('click', () => isRunning && handleModeAction());
    stopwatchDOMElements.repsBtn.addEventListener('click', () => setStopwatchMode('reps'));
    stopwatchDOMElements.lapsBtn.addEventListener('click', () => setStopwatchMode('laps'));
    stopwatchDOMElements.resetBtn.addEventListener('click', resetStopwatch);
    stopwatchDOMElements.saveBtn.addEventListener('click', () => saveStopwatchResult(elapsedTime));
    stopwatchDOMElements.exitBtn.addEventListener('click', (e) => { e.preventDefault(); exitStopwatch(); });
    if(stopwatchDOMElements.lapsCancelBtn) {
        stopwatchDOMElements.lapsCancelBtn.addEventListener('click', () => {
            stopwatchDOMElements.lapsModal.classList.remove('visible');
        });
    }
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && stopwatchDOMElements.stopwatchEl.classList.contains('visible')) {
            exitStopwatch();
        }
    });
}
