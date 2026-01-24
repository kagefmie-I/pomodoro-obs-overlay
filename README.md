# 🍅 Pomodoro OBS Overlay

A sleek, lightweight Pomodoro timer designed as an OBS Browser Source overlay for Twitch/YouTube streamers. Features a modern glassmorphism design, persistent state, and easy customization via URL parameters.

## 🚀 Live Demo

**Full UI (Control Panel):**  
`https://bskasan.github.io/pomodoro-obs-overlay-/`

**OBS Overlay (Timer Only):**  
`https://bskasan.github.io/pomodoro-obs-overlay-/?mode=overlay`

---

## ✨ Features

- 🎯 **Configurable sessions** - Set 1-20 study sessions
- ⏱️ **Flexible durations** - Customize study, short break, and long break times
- 🔄 **Auto-start option** - Automatically begin the next phase or pause for manual control
- 💾 **Persistent state** - Timer survives page refreshes and OBS reloads
- 🎨 **Glassmorphism UI** - Modern design with optional transparent mode
- 🔗 **URL parameters** - Pre-configure everything via URL
- 🎮 **Overlay controls** - Play/Pause, Stop, and Restart buttons directly in the overlay

---

## 🎮 Quick Start for OBS

### Step 1: Add Browser Source

1. In OBS, click **+** under Sources
2. Select **Browser**
3. Name it "Pomodoro Timer"

### Step 2: Configure the Source

| Setting | Value |
|---------|-------|
| **URL** | `https://bskasan.github.io/pomodoro-obs-overlay-/?mode=overlay` |
| **Width** | `600` |
| **Height** | `200` |

### Step 3: Important Settings

- ✅ **Uncheck** "Shutdown source when not visible"
- ✅ **Uncheck** "Refresh browser when scene becomes active"

### Step 4: Control Your Timer

**Option A: Use OBS Interact (Recommended)**
1. Right-click your Pomodoro Browser Source
2. Select **Interact**
3. Click the overlay controls: ▶ (Play/Pause), ⏹ (Stop), ↺ (Restart)

**Option B: Use the Control Panel**  
Open the full UI in your browser — the overlay in OBS will automatically sync!

---

## 🎛️ URL Parameters

| Parameter | Description | Default | Range |
|-----------|-------------|---------|-------|
| `mode` | Set to `overlay` for timer-only view | full | `overlay` |
| `sessions` | Total study sessions | 4 | 1-20 |
| `study` | Study duration (minutes) | 25 | 1-300 |
| `short` | Short break duration (minutes) | 5 | 1-300 |
| `long` | Long break duration (minutes) | 15 | 1-300 |
| `longEvery` | Long break frequency | 4 | 1-10 |
| `auto` | Auto-start next phase | 1 | `1` or `0` |
| `glass` | Glass background effect | 1 | `1` or `0` |
| `start` | Auto-start timer on page load | 0 | `1` or `0` |

### Example URLs

```
?mode=overlay&study=50&short=10&long=20    # 50-min sessions
?mode=overlay&sessions=6&glass=0            # 6 sessions, no glass
?mode=overlay&auto=0                        # Manual mode
?mode=overlay&start=1                       # Auto-start on load
```

---

## 🛠️ Self-Hosting

1. **Fork** this repository
2. Go to **Settings** → **Pages**
3. Set source to `main` branch
4. Your overlay will be live at `https://YOUR-USERNAME.github.io/pomodoro-obs-overlay-/`

---

## 📄 License

MIT License - Feel free to use, modify, and share!

---

Built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies.

**Made for streamers, by streamers.** 🎬
