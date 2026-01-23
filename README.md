# 🍅 Pomodoro OBS Overlay

A sleek, lightweight Pomodoro timer designed as an OBS Browser Source overlay for Twitch/YouTube streamers. Features a modern glassmorphism design, persistent state, and easy customization via URL parameters.

<!-- Replace with your actual GitHub Pages URL -->
## 🚀 Live Demo

**Full UI (Control Panel):**  
`https://bskasan.github.io/pomodoro-obs-overlay/`

**OBS Overlay (Timer Only):**  
`https://bskasan.github.io/pomodoro-obs-overlay/?mode=overlay`

---

## ✨ Features

- 🎯 **Configurable sessions** - Set 1-20 study sessions
- ⏱️ **Flexible durations** - Customize study, short break, and long break times
- 🔄 **Auto-start option** - Automatically begin the next phase or pause for manual control
- 💾 **Persistent state** - Timer survives page refreshes and OBS reloads
- 🎨 **Glassmorphism UI** - Modern design with optional transparent mode
- 🔗 **URL parameters** - Pre-configure everything via URL
- 📋 **One-click OBS URL** - Generate and copy your overlay URL instantly

---

## 🎮 Quick Start for OBS

### Step 1: Add Browser Source

1. In OBS, click **+** under Sources
2. Select **Browser**
3. Name it "Pomodoro Timer"

### Step 2: Configure the Source

| Setting | Value |
|---------|-------|
| **URL** | `https://bskasan.github.io/pomodoro-obs-overlay/?mode=overlay` |
| **Width** | `600` |
| **Height** | `200` |
| **Custom CSS** | *(leave empty)* |

### Step 3: Important Settings

- ✅ **Uncheck** "Shutdown source when not visible"
- ✅ **Uncheck** "Refresh browser when scene becomes active"

### Step 4: Control Your Timer

Open the full UI in your browser to control the timer:
```
https://bskasan.github.io/pomodoro-obs-overlay/
```

The overlay in OBS will automatically sync!

---

## 🎛️ URL Parameters

Customize your overlay by adding parameters to the URL:

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

### Example URLs

**50-minute study sessions with 10-minute breaks:**
```
?mode=overlay&study=50&short=10&long=20
```

**6 sessions, no glass effect:**
```
?mode=overlay&sessions=6&glass=0
```

**Manual mode (pause between phases):**
```
?mode=overlay&auto=0
```

---

## 🎨 Phase Colors

The overlay changes color based on the current phase:

| Phase | Color | Hex |
|-------|-------|-----|
| 📚 Study | Cyan | `#00D9FF` |
| ☕ Short Break | Green | `#4ADE80` |
| 🌴 Long Break | Orange | `#FB923C` |
| ✅ Completed | Purple | `#A78BFA` |

---

## 📐 Recommended Sizes

| Size | Dimensions | Use Case |
|------|------------|----------|
| **Compact** | 400 x 160 | Corner placement |
| **Standard** | 600 x 200 | Prominent display |
| **Large** | 800 x 250 | Full-width bars |

---

## 💾 Data Persistence

Your settings and timer state are saved in your browser's localStorage:

- `pomodoro_settings` - Your configuration
- `pomodoro_timer_state` - Current timer state (phase, time remaining, etc.)

**Note:** Each browser/device has its own localStorage. The control panel and OBS overlay share data only when using the same browser on the same device.

---

## 🛠️ Self-Hosting

Want to host your own copy?

1. **Fork** this repository
2. Go to **Settings** → **Pages**
3. Set source to `main` branch
4. Your overlay will be live at `https://bskasan.github.io/REPO-NAME/`

---

## 📄 License

MIT License - Feel free to use, modify, and share!

---

## 🙏 Credits

Built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies.

**Made for streamers, by streamers.** 🎬
