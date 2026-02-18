# Chromebook Tester

A single-page, no-login hardware tester for Chromebooks — built with pure HTML, CSS, and JavaScript.

## ✅ Implemented Features

### Top Row (5-column grid, no scrolling, fits one screen)
| # | Tester | Ratio | Notes |
|---|--------|-------|-------|
| 1 | **Video/Audio** | 16:9 | Autoplays `aria math.mp4` with sound; unmute overlay if browser blocks autoplay |
| 2 | **Microphone** | 1:1 | Requests mic on load; real-time frequency bar visualizer; Record + Playback buttons |
| 3 | **Battery** | 1:1 | Live level %, charging/discharging status, time remaining via Battery API |
| 4 | **Camera** | 1:1 | Requests camera on load; live front-facing feed |
| 5 | **Touchscreen** | 1:1 | "Start Test" → fullscreen blue-grid; tap/slide turns cells orange |

### Bottom (full-width)
- **Keyboard Tester** — Full Chromebook QWERTY layout including:
  - F-row (Esc, Back, Forward, Refresh, Fullscreen, Brightness, Volume, Power)
  - All standard QWERTY keys with symbols
  - Search key (Caps Lock position)
  - Shift, Tab, Enter, Backspace, Space
  - Ctrl, Alt (both sides), Arrow keys (↑↓ stacked, ←→)
  - **Blue flash** while key is held, **fades instantly** on release
  - **Green lock** once a key has been pressed (stays green)
  - **Click.mp3** sound on every keydown
  - Info bar: key name, key code, % of all keys pressed

## 📂 File Structure
```
index.html          Main page
css/style.css       All styles (dark theme, responsive)
js/main.js          All JavaScript (6 testers)
Click.mp3           Click sound for keyboard tester
aria math.mp4       Video served from CDN URL (>20 MB limit)
```

## 🌐 Entry URI
- `index.html` — main and only page, no login required

## ⚙️ Design Decisions
- **No scrolling** — JS `doLayout()` calculates exact pixel heights for top grid and keyboard section on every resize
- **No headers** — all cards are functional testers only
- **Dark theme** — `#0d1119` background, `#161c2a` card surfaces
- **Card borders** — `1.5px solid #253050` rounded border on every card
- **Video** — referenced via CDN URL (file >20 MB); Click.mp3 stored locally in project root

## 🔧 Browser Permissions Required
| Feature | Permission |
|---------|-----------|
| Microphone | `getUserMedia({ audio })` |
| Camera | `getUserMedia({ video })` |
| Battery | Battery Status API (`navigator.getBattery`) |
| Fullscreen | Fullscreen API (touch test) |

## 🚀 Deployment
Go to the **Publish tab** to deploy and get a live URL.
