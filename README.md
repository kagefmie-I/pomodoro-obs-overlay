# Pomodoro Timer - OBS Overlay

A lightweight, persistent pomodoro timer designed for Twitch streaming and OBS Browser Sources.

## Features

- Configurable study sessions (1-20)
- Configurable study/break durations
- Short and long break support with customizable frequency
- Persistent state across page refreshes and OBS reloads
- Full mode (settings + controls) and Overlay mode (timer only)
- Transparent background for OBS
- Modern glassmorphism design with phase-specific colors

## Running Locally

### Option 1: Direct File Open
Simply open `index.html` in your browser. Works for basic testing.

### Option 2: Local Server (Recommended for OBS)
Using Python:
```bash
python -m http.server 8000
```

Using Node.js:
```bash
npx serve .
```

Then open `http://localhost:8000` in your browser.

## OBS Setup

1. Add a **Browser Source** in OBS
2. Set the URL to: `http://localhost:8000/?mode=overlay`
3. Set dimensions: **400x160** (compact) or **600x200** (standard)
4. Uncheck **"Shutdown source when not visible"**
5. Uncheck **"Refresh browser when scene becomes active"**
6. The transparent background will work automatically

## URL Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| `mode` | `overlay` | Hides settings and controls, shows only the timer |

## Keyboard Workflow

1. Open the full UI (`http://localhost:8000`) to configure settings
2. The overlay in OBS (`http://localhost:8000/?mode=overlay`) will reflect the same state
3. Control the timer from the full UI - the overlay updates in real-time

## Phase Colors

- **Study**: Cyan (#00D9FF)
- **Short Break**: Green (#4ADE80)
- **Long Break**: Orange (#FB923C)
- **Completed**: Purple (#A78BFA)

## Data Persistence

Settings and timer state are saved to localStorage:
- `pomodoro_settings` - Your configuration
- `pomodoro_timer_state` - Current timer state

Use the "Reset All Data" button to clear everything.
