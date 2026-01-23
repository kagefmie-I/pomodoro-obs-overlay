/**
 * Pomodoro Timer - OBS Overlay
 * A lightweight, persistent pomodoro timer for Twitch streaming
 */

// ========================================
// Constants & Storage Keys
// ========================================

const STORAGE_KEYS = {
  SETTINGS: 'pomodoro_settings',
  TIMER_STATE: 'pomodoro_timer_state'
};

const PHASE = {
  STUDY: 'study',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
  FINISHED: 'finished'
};

const PHASE_LABELS = {
  [PHASE.STUDY]: 'STUDY',
  [PHASE.SHORT_BREAK]: 'SHORT BREAK',
  [PHASE.LONG_BREAK]: 'LONG BREAK',
  [PHASE.FINISHED]: 'COMPLETED'
};

const DEFAULT_SETTINGS = {
  totalSessions: 4,
  studyDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakEvery: 4,
  autoStartNextPhase: true,
  glassEnabled: true
};

// URL Parameter mapping and validation
const URL_PARAM_CONFIG = {
  sessions: { key: 'totalSessions', type: 'int', min: 1, max: 20 },
  study: { key: 'studyDuration', type: 'int', min: 1, max: 300 },
  short: { key: 'shortBreakDuration', type: 'int', min: 1, max: 300 },
  long: { key: 'longBreakDuration', type: 'int', min: 1, max: 300 },
  longEvery: { key: 'longBreakEvery', type: 'int', min: 1, max: 10 },
  auto: { key: 'autoStartNextPhase', type: 'bool' },
  glass: { key: 'glassEnabled', type: 'bool' }
};

// ========================================
// State
// ========================================

let settings = { ...DEFAULT_SETTINGS };

let timerState = {
  phase: PHASE.STUDY,
  currentSession: 1,
  secondsRemaining: DEFAULT_SETTINGS.studyDuration * 60,
  isRunning: false,
  lastTick: null
};

let timerInterval = null;

// ========================================
// DOM Elements
// ========================================

const elements = {
  // Settings inputs
  totalSessions: document.getElementById('totalSessions'),
  studyDuration: document.getElementById('studyDuration'),
  shortBreakDuration: document.getElementById('shortBreakDuration'),
  longBreakDuration: document.getElementById('longBreakDuration'),
  longBreakEvery: document.getElementById('longBreakEvery'),
  autoStartNextPhase: document.getElementById('autoStartNextPhase'),
  glassEnabled: document.getElementById('glassEnabled'),
  
  // Display
  overlayDisplay: document.getElementById('overlayDisplay'),
  phaseLabel: document.getElementById('phaseLabel'),
  sessionCounter: document.getElementById('sessionCounter'),
  timerDisplay: document.getElementById('timerDisplay'),
  
  // Icon Controls
  iconControls: document.getElementById('iconControls'),
  startPauseBtn: document.getElementById('startPauseBtn'),
  startPauseIcon: document.getElementById('startPauseIcon'),
  resetBtn: document.getElementById('resetBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  
  // Modal
  modalBackdrop: document.getElementById('modalBackdrop'),
  settingsModal: document.getElementById('settingsModal'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabPanels: document.querySelectorAll('.tab-panel'),
  
  // Secondary controls (in modal)
  restartPhaseBtn: document.getElementById('restartPhaseBtn'),
  skipPhaseBtn: document.getElementById('skipPhaseBtn'),
  resetAllBtn: document.getElementById('resetAllBtn'),
  
  // OBS URL
  obsUrlPreview: document.getElementById('obsUrlPreview'),
  copyObsUrlBtn: document.getElementById('copyObsUrlBtn'),
  copyBtnText: document.getElementById('copyBtnText')
};

// ========================================
// Utility Functions
// ========================================

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getPhaseDuration(phase) {
  switch (phase) {
    case PHASE.STUDY:
      return settings.studyDuration * 60;
    case PHASE.SHORT_BREAK:
      return settings.shortBreakDuration * 60;
    case PHASE.LONG_BREAK:
      return settings.longBreakDuration * 60;
    default:
      return 0;
  }
}

// ========================================
// Storage Functions
// ========================================

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      settings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveTimerState() {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(timerState));
  } catch (e) {
    console.warn('Failed to save timer state:', e);
  }
}

function loadTimerState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      timerState = {
        phase: parsed.phase || PHASE.STUDY,
        currentSession: parsed.currentSession || 1,
        secondsRemaining: parsed.secondsRemaining ?? (settings.studyDuration * 60),
        isRunning: parsed.isRunning || false,
        lastTick: parsed.lastTick || null
      };
    } else {
      timerState = {
        phase: PHASE.STUDY,
        currentSession: 1,
        secondsRemaining: settings.studyDuration * 60,
        isRunning: false,
        lastTick: null
      };
    }
  } catch (e) {
    console.warn('Failed to load timer state:', e);
    timerState = {
      phase: PHASE.STUDY,
      currentSession: 1,
      secondsRemaining: settings.studyDuration * 60,
      isRunning: false,
      lastTick: null
    };
  }
}

function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.TIMER_STATE);
  } catch (e) {
    console.warn('Failed to clear data:', e);
  }
}

// ========================================
// UI Update Functions
// ========================================

function updateSettingsUI() {
  if (elements.totalSessions) elements.totalSessions.value = settings.totalSessions;
  if (elements.studyDuration) elements.studyDuration.value = settings.studyDuration;
  if (elements.shortBreakDuration) elements.shortBreakDuration.value = settings.shortBreakDuration;
  if (elements.longBreakDuration) elements.longBreakDuration.value = settings.longBreakDuration;
  if (elements.longBreakEvery) elements.longBreakEvery.value = settings.longBreakEvery;
  
  if (elements.autoStartNextPhase) {
    elements.autoStartNextPhase.checked = settings.autoStartNextPhase;
  }
  if (elements.glassEnabled) {
    elements.glassEnabled.checked = settings.glassEnabled;
  }
}

function updateGlassMode() {
  if (settings.glassEnabled) {
    elements.overlayDisplay.classList.remove('glass-off');
  } else {
    elements.overlayDisplay.classList.add('glass-off');
  }
}

function updateTimerDisplay() {
  // Update timer text
  elements.timerDisplay.textContent = formatTime(timerState.secondsRemaining);
  
  // Update phase label
  elements.phaseLabel.textContent = PHASE_LABELS[timerState.phase];
  
  // Update session counter
  if (timerState.phase === PHASE.FINISHED) {
    elements.sessionCounter.textContent = `All ${settings.totalSessions} sessions complete!`;
  } else {
    elements.sessionCounter.textContent = `Session ${timerState.currentSession}/${settings.totalSessions}`;
  }
  
  // Update phase class on overlay
  elements.overlayDisplay.className = 'overlay-display';
  elements.overlayDisplay.classList.add(`phase-${timerState.phase}`);
  
  // Add running class if timer is active
  if (timerState.isRunning) {
    elements.overlayDisplay.classList.add('is-running');
  }
  
  // Preserve glass-off class
  if (!settings.glassEnabled) {
    elements.overlayDisplay.classList.add('glass-off');
  }
  
  // Update start/pause button icon
  if (elements.startPauseIcon) {
    if (timerState.phase === PHASE.FINISHED) {
      elements.startPauseIcon.textContent = '↺';
    } else if (timerState.isRunning) {
      elements.startPauseIcon.textContent = '⏸';
    } else {
      elements.startPauseIcon.textContent = '▶';
    }
  }
  
  // Update primary button style based on phase
  if (elements.startPauseBtn) {
    elements.startPauseBtn.classList.toggle('icon-btn-primary', !timerState.isRunning || timerState.phase === PHASE.FINISHED);
  }
}

function triggerPhaseChangeAnimation() {
  elements.overlayDisplay.classList.remove('phase-change');
  void elements.overlayDisplay.offsetWidth;
  elements.overlayDisplay.classList.add('phase-change');
}

// ========================================
// Phase Logic
// ========================================

function getNextPhase() {
  if (timerState.phase === PHASE.STUDY) {
    if (timerState.currentSession >= settings.totalSessions) {
      return { phase: PHASE.FINISHED, incrementSession: false };
    }
    
    if (timerState.currentSession % settings.longBreakEvery === 0) {
      return { phase: PHASE.LONG_BREAK, incrementSession: false };
    } else {
      return { phase: PHASE.SHORT_BREAK, incrementSession: false };
    }
  } else if (timerState.phase === PHASE.SHORT_BREAK || timerState.phase === PHASE.LONG_BREAK) {
    return { phase: PHASE.STUDY, incrementSession: true };
  }
  
  return { phase: PHASE.STUDY, incrementSession: false };
}

function advancePhase(fromTick = false) {
  const { phase: nextPhase, incrementSession } = getNextPhase();
  
  if (incrementSession) {
    timerState.currentSession++;
  }
  
  timerState.phase = nextPhase;
  timerState.secondsRemaining = getPhaseDuration(nextPhase);
  
  if (nextPhase === PHASE.FINISHED) {
    stopTimer();
  } else if (fromTick && !settings.autoStartNextPhase) {
    stopTimer();
  }
  
  triggerPhaseChangeAnimation();
  saveTimerState();
  updateTimerDisplay();
}

// ========================================
// Timer Control Functions
// ========================================

function tick() {
  const now = Date.now();
  
  if (timerState.lastTick) {
    const elapsed = Math.floor((now - timerState.lastTick) / 1000);
    timerState.secondsRemaining -= elapsed;
  }
  
  timerState.lastTick = now;
  
  while (timerState.secondsRemaining <= 0 && timerState.phase !== PHASE.FINISHED && timerState.isRunning) {
    const overflow = Math.abs(timerState.secondsRemaining);
    advancePhase(true);
    
    if (!timerState.isRunning) {
      break;
    }
    
    if (timerState.phase !== PHASE.FINISHED && overflow > 0) {
      timerState.secondsRemaining -= overflow;
    }
  }
  
  if (timerState.secondsRemaining < 0) {
    timerState.secondsRemaining = 0;
  }
  
  saveTimerState();
  updateTimerDisplay();
}

function startTimer() {
  if (timerState.phase === PHASE.FINISHED) {
    resetTimer();
    return;
  }
  
  timerState.isRunning = true;
  timerState.lastTick = Date.now();
  saveTimerState();
  updateTimerDisplay();
  
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(tick, 1000);
}

function stopTimer() {
  timerState.isRunning = false;
  timerState.lastTick = null;
  saveTimerState();
  updateTimerDisplay();
  
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function toggleTimer() {
  if (timerState.isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  stopTimer();
  
  timerState.phase = PHASE.STUDY;
  timerState.currentSession = 1;
  timerState.secondsRemaining = settings.studyDuration * 60;
  timerState.isRunning = false;
  timerState.lastTick = null;
  
  saveTimerState();
  updateTimerDisplay();
}

function restartCurrentPhase() {
  const wasRunning = timerState.isRunning;
  
  if (wasRunning) {
    stopTimer();
  }
  
  timerState.secondsRemaining = getPhaseDuration(timerState.phase);
  timerState.lastTick = null;
  
  saveTimerState();
  updateTimerDisplay();
  
  if (wasRunning && timerState.phase !== PHASE.FINISHED) {
    startTimer();
  }
}

function skipPhase() {
  if (timerState.phase === PHASE.FINISHED) {
    return;
  }
  
  const wasRunning = timerState.isRunning;
  
  if (wasRunning) {
    stopTimer();
  }
  
  advancePhase(false);
  
  if (wasRunning && timerState.phase !== PHASE.FINISHED) {
    startTimer();
  }
}

// ========================================
// Settings Handlers
// ========================================

function handleSettingChange(key, value) {
  const numValue = parseInt(value, 10);
  
  if (isNaN(numValue) || numValue < 1) {
    return;
  }
  
  settings[key] = numValue;
  saveSettings();
  updateObsUrlPreview();
  
  if (!timerState.isRunning && timerState.phase === PHASE.STUDY && timerState.currentSession === 1) {
    if (key === 'studyDuration') {
      timerState.secondsRemaining = numValue * 60;
      saveTimerState();
      updateTimerDisplay();
    }
  }
}

// ========================================
// Modal Functions
// ========================================

function openModal() {
  if (elements.modalBackdrop) {
    elements.modalBackdrop.classList.add('open');
  }
}

function closeModal() {
  if (elements.modalBackdrop) {
    elements.modalBackdrop.classList.remove('open');
  }
}

function switchTab(tabId) {
  // Update tab buttons
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  // Update tab panels
  elements.tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
  // Settings inputs
  if (elements.totalSessions) {
    elements.totalSessions.addEventListener('change', (e) => {
      handleSettingChange('totalSessions', e.target.value);
    });
  }
  
  if (elements.studyDuration) {
    elements.studyDuration.addEventListener('change', (e) => {
      handleSettingChange('studyDuration', e.target.value);
    });
  }
  
  if (elements.shortBreakDuration) {
    elements.shortBreakDuration.addEventListener('change', (e) => {
      handleSettingChange('shortBreakDuration', e.target.value);
    });
  }
  
  if (elements.longBreakDuration) {
    elements.longBreakDuration.addEventListener('change', (e) => {
      handleSettingChange('longBreakDuration', e.target.value);
    });
  }
  
  if (elements.longBreakEvery) {
    elements.longBreakEvery.addEventListener('change', (e) => {
      handleSettingChange('longBreakEvery', e.target.value);
    });
  }
  
  // Toggle settings
  if (elements.autoStartNextPhase) {
    elements.autoStartNextPhase.addEventListener('change', (e) => {
      settings.autoStartNextPhase = e.target.checked;
      saveSettings();
      updateObsUrlPreview();
    });
  }
  
  if (elements.glassEnabled) {
    elements.glassEnabled.addEventListener('change', (e) => {
      settings.glassEnabled = e.target.checked;
      saveSettings();
      updateGlassMode();
      updateObsUrlPreview();
    });
  }
  
  // Icon control buttons
  if (elements.startPauseBtn) {
    elements.startPauseBtn.addEventListener('click', toggleTimer);
  }
  
  if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', resetTimer);
  }
  
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', openModal);
  }
  
  // Modal controls
  if (elements.modalCloseBtn) {
    elements.modalCloseBtn.addEventListener('click', closeModal);
  }
  
  if (elements.modalBackdrop) {
    elements.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.modalBackdrop) {
        closeModal();
      }
    });
  }
  
  // Tab switching
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });
  
  // Keyboard shortcut to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.modalBackdrop?.classList.contains('open')) {
      closeModal();
    }
  });
  
  // Secondary controls (in modal)
  if (elements.restartPhaseBtn) {
    elements.restartPhaseBtn.addEventListener('click', restartCurrentPhase);
  }
  
  if (elements.skipPhaseBtn) {
    elements.skipPhaseBtn.addEventListener('click', skipPhase);
  }
  
  // OBS URL copy button
  if (elements.copyObsUrlBtn) {
    elements.copyObsUrlBtn.addEventListener('click', copyObsUrl);
  }
  
  // Reset all button
  if (elements.resetAllBtn) {
    elements.resetAllBtn.addEventListener('click', () => {
      if (confirm('Reset all settings and timer data?')) {
        clearAllData();
        settings = { ...DEFAULT_SETTINGS };
        timerState = {
          phase: PHASE.STUDY,
          currentSession: 1,
          secondsRemaining: settings.studyDuration * 60,
          isRunning: false,
          lastTick: null
        };
        stopTimer();
        updateSettingsUI();
        updateTimerDisplay();
        updateGlassMode();
        updateObsUrlPreview();
        closeModal();
      }
    });
  }
}

// ========================================
// Overlay Mode Detection
// ========================================

function checkOverlayMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const isOverlayMode = urlParams.get('mode') === 'overlay';
  
  if (isOverlayMode) {
    document.body.classList.add('overlay-mode');
  }
  
  return isOverlayMode;
}

// ========================================
// URL Parameter Parsing
// ========================================

function parseUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  let hasOverrides = false;
  
  for (const [param, config] of Object.entries(URL_PARAM_CONFIG)) {
    const value = urlParams.get(param);
    
    if (value === null) continue;
    
    if (config.type === 'int') {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= config.min && numValue <= config.max) {
        settings[config.key] = numValue;
        hasOverrides = true;
      }
    } else if (config.type === 'bool') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === '1' || lowerValue === 'true') {
        settings[config.key] = true;
        hasOverrides = true;
      } else if (lowerValue === '0' || lowerValue === 'false') {
        settings[config.key] = false;
        hasOverrides = true;
      }
    }
  }
  
  if (hasOverrides) {
    saveSettings();
  }
}

// ========================================
// OBS URL Generator
// ========================================

function generateObsUrl() {
  const baseUrl = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  
  params.set('mode', 'overlay');
  params.set('sessions', settings.totalSessions);
  params.set('study', settings.studyDuration);
  params.set('short', settings.shortBreakDuration);
  params.set('long', settings.longBreakDuration);
  params.set('longEvery', settings.longBreakEvery);
  params.set('auto', settings.autoStartNextPhase ? '1' : '0');
  params.set('glass', settings.glassEnabled ? '1' : '0');
  
  return `${baseUrl}?${params.toString()}`;
}

function updateObsUrlPreview() {
  if (elements.obsUrlPreview) {
    elements.obsUrlPreview.value = generateObsUrl();
  }
}

async function copyObsUrl() {
  const url = generateObsUrl();
  
  try {
    await navigator.clipboard.writeText(url);
    
    if (elements.copyBtnText) {
      elements.copyBtnText.textContent = 'Copied!';
      elements.copyObsUrlBtn.classList.add('copied');
      
      setTimeout(() => {
        elements.copyBtnText.textContent = 'Copy';
        elements.copyObsUrlBtn.classList.remove('copied');
      }, 2000);
    }
  } catch (err) {
    if (elements.obsUrlPreview) {
      elements.obsUrlPreview.select();
      document.execCommand('copy');
    }
  }
}

// ========================================
// Resume Logic (for page refresh/OBS reload)
// ========================================

function resumeFromSavedState() {
  if (timerState.isRunning && timerState.lastTick) {
    const now = Date.now();
    const elapsed = Math.floor((now - timerState.lastTick) / 1000);
    
    timerState.secondsRemaining -= elapsed;
    
    let crossedPhaseBoundary = false;
    
    while (timerState.secondsRemaining <= 0 && timerState.phase !== PHASE.FINISHED) {
      crossedPhaseBoundary = true;
      const overflow = Math.abs(timerState.secondsRemaining);
      
      const { phase: nextPhase, incrementSession } = getNextPhase();
      
      if (incrementSession) {
        timerState.currentSession++;
      }
      
      timerState.phase = nextPhase;
      
      if (nextPhase === PHASE.FINISHED) {
        timerState.secondsRemaining = 0;
        timerState.isRunning = false;
        break;
      }
      
      if (!settings.autoStartNextPhase) {
        timerState.secondsRemaining = getPhaseDuration(nextPhase);
        timerState.isRunning = false;
        break;
      }
      
      timerState.secondsRemaining = getPhaseDuration(nextPhase) - overflow;
    }
    
    if (timerState.secondsRemaining < 0) {
      timerState.secondsRemaining = 0;
    }
    
    if (timerState.isRunning) {
      timerState.lastTick = Date.now();
      timerInterval = setInterval(tick, 1000);
    }
    
    if (crossedPhaseBoundary) {
      triggerPhaseChangeAnimation();
    }
    
    saveTimerState();
  }
}

// ========================================
// Initialization
// ========================================

function init() {
  const isOverlay = checkOverlayMode();
  
  loadSettings();
  parseUrlParams();
  loadTimerState();
  resumeFromSavedState();
  
  updateSettingsUI();
  updateTimerDisplay();
  updateGlassMode();
  updateObsUrlPreview();
  
  setupEventListeners();
  
  console.log('Pomodoro Timer initialized', isOverlay ? '(overlay mode)' : '(full mode)');
}

document.addEventListener('DOMContentLoaded', init);
