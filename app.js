/**
 * Pomodoro Timer - OBS Overlay
 * A lightweight, persistent pomodoro timer for Twitch streaming
 */

// ========================================
// Constants & Storage Keys
// ========================================

const STORAGE_KEYS = {
  SETTINGS: 'pomodoro_settings',
  TIMER_STATE: 'pomodoro_timer_state',
  START_ON_LOAD_PREF: 'pomodoro_start_on_load_pref'
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

// Cross-tab synchronization
let broadcastChannel = null;
let syncPollInterval = null;

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
  copyBtnText: document.getElementById('copyBtnText'),
  startOnLoadToggle: document.getElementById('startOnLoadToggle'),
  
  // Overlay Controls
  overlayControls: document.getElementById('overlayControls'),
  overlayPlayPauseBtn: document.getElementById('overlayPlayPauseBtn'),
  overlayPlayPauseIcon: document.getElementById('overlayPlayPauseIcon'),
  overlayStopBtn: document.getElementById('overlayStopBtn'),
  overlayRestartBtn: document.getElementById('overlayRestartBtn')
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
    const settingsString = JSON.stringify(settings);
    localStorage.setItem(STORAGE_KEYS.SETTINGS, settingsString);
    
    // Broadcast change to other tabs/windows
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'settingsUpdate',
        settings: settings
      });
    }
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
    // Add a sync timestamp to help with cross-context synchronization
    const stateWithTimestamp = {
      ...timerState,
      _syncTimestamp: Date.now(),
      _syncVersion: (timerState._syncVersion || 0) + 1
    };
    
    const stateString = JSON.stringify(stateWithTimestamp);
    localStorage.setItem(STORAGE_KEYS.TIMER_STATE, stateString);
    
    // Also save to a separate sync key for better cross-context access
    localStorage.setItem('pomodoro_sync_heartbeat', Date.now().toString());
    localStorage.setItem('pomodoro_sync_state', stateString);
    
    // Broadcast change to other tabs/windows
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'timerStateUpdate',
        state: timerState
      });
    }
    
    // Trigger storage event manually (for same-origin listeners)
    window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEYS.TIMER_STATE,
      newValue: stateString,
      storageArea: localStorage
    }));
  } catch (e) {
    console.warn('Failed to save timer state:', e);
  }
}

function loadTimerState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // Validate and fix invalid state
      let currentSession = parsed.currentSession || 1;
      if (currentSession > settings.totalSessions) {
        currentSession = 1;
      }
      if (currentSession < 1) {
        currentSession = 1;
      }
      
      timerState = {
        phase: parsed.phase || PHASE.STUDY,
        currentSession: currentSession,
        secondsRemaining: parsed.secondsRemaining ?? (settings.studyDuration * 60),
        isRunning: parsed.isRunning || false,
        lastTick: parsed.lastTick || null
      };
      
      // Ensure seconds remaining is valid for current phase
      if (timerState.secondsRemaining < 0) {
        timerState.secondsRemaining = getPhaseDuration(timerState.phase);
      }
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
// Cross-Tab Synchronization
// ========================================

function syncTimerStateFromStorage() {
  try {
    // Try multiple storage keys for better cross-context compatibility
    let saved = localStorage.getItem(STORAGE_KEYS.TIMER_STATE) || 
                localStorage.getItem('pomodoro_sync_state');
    
    if (!saved) return;
    
    const parsed = JSON.parse(saved);
    
    // Check heartbeat to see if state is fresh (within last 5 seconds)
    const heartbeat = parseInt(localStorage.getItem('pomodoro_sync_heartbeat') || '0', 10);
    const now = Date.now();
    const heartbeatAge = now - heartbeat;
    
    // If heartbeat is too old (more than 5 seconds), state might be stale
    if (heartbeatAge > 5000 && parsed.isRunning) {
      // State might be stale, but still try to sync
      console.log('Warning: Heartbeat is stale, state may be outdated');
    }
    
    // Validate parsed state
    let currentSession = parsed.currentSession || 1;
    if (currentSession > settings.totalSessions) {
      currentSession = 1;
    }
    if (currentSession < 1) {
      currentSession = 1;
    }
    
    const newState = {
      phase: parsed.phase || PHASE.STUDY,
      currentSession: currentSession,
      secondsRemaining: parsed.secondsRemaining ?? (settings.studyDuration * 60),
      isRunning: parsed.isRunning || false,
      lastTick: parsed.lastTick || null,
      _syncTimestamp: parsed._syncTimestamp || now,
      _syncVersion: parsed._syncVersion || 0
    };
    
    // If timer is running, recalculate remaining time based on elapsed time
    if (newState.isRunning && newState.lastTick) {
      const elapsed = Math.floor((now - newState.lastTick) / 1000);
      newState.secondsRemaining = Math.max(0, newState.secondsRemaining - elapsed);
    }
    
    // Check if state actually changed (compare key fields and sync version)
    const stateChanged = 
      timerState.phase !== newState.phase ||
      timerState.currentSession !== newState.currentSession ||
      Math.abs(timerState.secondsRemaining - newState.secondsRemaining) > 1 || // Allow 1 second difference
      timerState.isRunning !== newState.isRunning ||
      (newState._syncVersion && (timerState._syncVersion || 0) < newState._syncVersion);
    
    if (stateChanged) {
      const wasRunning = timerState.isRunning;
      const oldPhase = timerState.phase;
      
      timerState = newState;
      
      // Restart timer if it should be running
      if (timerState.isRunning && !wasRunning) {
        timerState.lastTick = Date.now();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(tick, 1000);
        console.log('Timer started via sync');
      } else if (!timerState.isRunning && wasRunning) {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        console.log('Timer stopped via sync');
      } else if (timerState.isRunning && wasRunning) {
        // Timer is running, update lastTick to current time to prevent drift
        timerState.lastTick = Date.now();
      }
      
      // Update display
      updateTimerDisplay();
      
      // Trigger animation if phase changed
      if (oldPhase !== timerState.phase) {
        triggerPhaseChangeAnimation();
      }
    }
  } catch (e) {
    console.warn('Failed to sync timer state:', e);
  }
}

function syncSettingsFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!saved) return;
    
    const parsed = JSON.parse(saved);
    
    // Only sync if settings changed
    if (JSON.stringify(settings) !== JSON.stringify(parsed)) {
      settings = { ...DEFAULT_SETTINGS, ...parsed };
      updateSettingsUI();
      updateGlassMode();
      updateObsUrlPreview();
      
      // If timer is not running, update display
      if (!timerState.isRunning) {
        updateTimerDisplay();
      }
    }
  } catch (e) {
    console.warn('Failed to sync settings:', e);
  }
}

function setupSync() {
  // Use BroadcastChannel API if available (modern browsers)
  if (typeof BroadcastChannel !== 'undefined') {
    broadcastChannel = new BroadcastChannel('pomodoro-timer-sync');
    
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'timerStateUpdate') {
        syncTimerStateFromStorage();
      } else if (event.data.type === 'settingsUpdate') {
        syncSettingsFromStorage();
      }
    };
  }
  
  // Listen for storage events (works across tabs in same browser)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.TIMER_STATE) {
      syncTimerStateFromStorage();
    } else if (e.key === STORAGE_KEYS.SETTINGS) {
      syncSettingsFromStorage();
    }
  });
  
  // Poll localStorage as fallback (for OBS Browser Source which may not support events)
  // Use very frequent polling for OBS Browser Source compatibility (isolated storage)
  syncPollInterval = setInterval(() => {
    syncTimerStateFromStorage();
    syncSettingsFromStorage();
  }, 100); // Check every 100ms for maximum responsiveness
  
  // Also write heartbeat more frequently when timer is running
  setInterval(() => {
    if (timerState.isRunning) {
      try {
        localStorage.setItem('pomodoro_sync_heartbeat', Date.now().toString());
      } catch (e) {
        // Ignore errors
      }
    }
  }, 500); // Update heartbeat every 500ms when running
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
  
  // Update overlay play/pause button icon
  if (elements.overlayPlayPauseIcon) {
    if (timerState.phase === PHASE.FINISHED) {
      elements.overlayPlayPauseIcon.textContent = '↺';
    } else if (timerState.isRunning) {
      elements.overlayPlayPauseIcon.textContent = '⏸';
    } else {
      elements.overlayPlayPauseIcon.textContent = '▶';
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
  
  // Save state and update heartbeat on every tick for better sync
  saveTimerState();
  try {
    localStorage.setItem('pomodoro_sync_heartbeat', Date.now().toString());
  } catch (e) {
    // Ignore errors
  }
  
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
  
  // Overlay control buttons
  if (elements.overlayPlayPauseBtn) {
    elements.overlayPlayPauseBtn.addEventListener('click', toggleTimer);
  }
  
  if (elements.overlayStopBtn) {
    elements.overlayStopBtn.addEventListener('click', stopTimer);
  }
  
  if (elements.overlayRestartBtn) {
    elements.overlayRestartBtn.addEventListener('click', restartCurrentPhase);
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
  
  // Start on load toggle (for OBS URL generator)
  if (elements.startOnLoadToggle) {
    elements.startOnLoadToggle.addEventListener('change', (e) => {
      try {
        localStorage.setItem(STORAGE_KEYS.START_ON_LOAD_PREF, e.target.checked);
      } catch (err) {}
      updateObsUrlPreview();
    });
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
  const oldSettings = { ...settings };
  
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
  
  // If critical settings changed, reset timer state
  if (hasOverrides) {
    const settingsChanged = 
      oldSettings.totalSessions !== settings.totalSessions ||
      oldSettings.studyDuration !== settings.studyDuration ||
      oldSettings.shortBreakDuration !== settings.shortBreakDuration ||
      oldSettings.longBreakDuration !== settings.longBreakDuration ||
      oldSettings.longBreakEvery !== settings.longBreakEvery;
    
    if (settingsChanged) {
      // Reset timer to match new settings
      timerState = {
        phase: PHASE.STUDY,
        currentSession: 1,
        secondsRemaining: settings.studyDuration * 60,
        isRunning: false,
        lastTick: null
      };
      saveTimerState();
    }
    
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
  
  // Add start=1 if toggle is checked
  if (elements.startOnLoadToggle?.checked) {
    params.set('start', '1');
  }
  
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
// Auto-Start on Load (URL parameter)
// ========================================

function handleAutoStartOnLoad(isOverlay) {
  const urlParams = new URLSearchParams(window.location.search);
  const startParam = urlParams.get('start');
  
  // Only auto-start if:
  // 1. mode=overlay AND start=1/true
  // 2. timer is not already running (from resume)
  // 3. phase is not FINISHED
  if (isOverlay && 
      (startParam === '1' || startParam?.toLowerCase() === 'true') &&
      !timerState.isRunning &&
      timerState.phase !== PHASE.FINISHED) {
    console.log('Auto-starting timer via start= URL parameter');
    startTimer();
  }
}

// ========================================
// Initialization
// ========================================

function init() {
  const isOverlay = checkOverlayMode();
  
  loadSettings();
  parseUrlParams(); // This may reset timer state if settings changed
  loadTimerState(); // Load after URL params are applied
  resumeFromSavedState();
  handleAutoStartOnLoad(isOverlay); // Auto-start if start=1 URL param (after resume so it doesn't override saved running state)
  
  // Load start-on-load preference for OBS URL generator
  if (elements.startOnLoadToggle) {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.START_ON_LOAD_PREF);
      elements.startOnLoadToggle.checked = saved === 'true';
    } catch (e) {}
  }
  
  updateSettingsUI();
  updateTimerDisplay();
  updateGlassMode();
  updateObsUrlPreview();
  
  setupEventListeners();
  setupSync();
  
  console.log('Pomodoro Timer initialized', isOverlay ? '(overlay mode)' : '(full mode)');
  console.log('Settings:', settings);
  console.log('Timer State:', timerState);
  console.log('URL Params:', window.location.search);
  
  if (isOverlay) {
    console.log('⚠️ Overlay mode: If timer doesn\'t sync, OBS Browser Source may have isolated storage.');
    console.log('💡 Solution: Open control panel in the same browser window, or refresh OBS overlay after starting timer.');
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (syncPollInterval) {
    clearInterval(syncPollInterval);
  }
  if (broadcastChannel) {
    broadcastChannel.close();
  }
});

document.addEventListener('DOMContentLoaded', init);
