# 🤖 AI Hand Detection & Gesture-Based Computer Control System

An advanced touch-free human-computer interaction (HCI) system that uses real-time computer vision and 21-point hand landmark tracking to recognize intuitive hand gestures and map them directly into computer actions.

---

## 🌟 Key Features

- 🖐️ **Real-Time 21-Point Landmark Detection**: Utilizes deep learning handpose models to track finger joints, knuckles, and palm orientation with millisecond latency.
- 🎯 **Multi-Gesture Recognition Engine**:
  - ✋ **Open Palm**: Play / Pause media playback or presentation auto-advance.
  - 👍 **Thumbs Up**: Positive confirmation or Volume Up (+15%).
  - 👎 **Thumbs Down**: Cancel action or Volume Down (-15%).
  - ✌️ **Two Fingers (Peace / Victory)**: Navigate to Next Slide or Next Media Track.
  - ☝️ **Pointing (Index Finger)**: Navigate to Previous Slide or Previous Media Track.
  - ✊ **Fist**: Instant Stop or Mute operation.
  - 👌 **OK Sign**: Select option, enter, or toggle fullscreen.
- 🎬 **Touchless Media Control**: Built-in interactive player with play/pause, volume control, track switching, and fullscreen toggle.
- 📊 **Interactive Presentation Slides Deck**: Touch-free slide delivery with next/prev slide navigation and bullet point highlighting.
- 💻 **Virtual Keyboard & Action Dispatcher**: Real-time event simulator with visual feedback on keypresses.
- 🔊 **Multi-Modal Audio Feedback**: Synthesized futuristic UI chimes and Text-to-Speech (TTS) voice announcements for every triggered action.
- ⚡ **Debouncing & Cooldown Engine**: Prevents accidental repeated activations with a customizable cooldown timer and live visual countdown HUD.
- 🎨 **Futuristic Glassmorphism UI**: Cyberpunk landmark skeleton visualization, real-time gesture badges, and live terminal event stream.

---

## 🚀 How to Run the Project

### 1. Start the Local Web Server
In your terminal or PowerShell, run:
```powershell
python -m http.server 8000
```

### 2. Open in Your Browser
Open your browser and navigate to:
```
http://localhost:8000
```

### 3. Grant Camera Access
- When prompted by the browser, click **Allow** to grant webcam access.
- Once the AI model initializes (1–2 seconds), the AI toggle switch will turn on automatically and the live camera HUD will start tracking your hand!

---

## 📋 Gesture Action Matrix

| Gesture | Icon | Media Mode Action | Presentation Mode Action | Simulated Key |
| :--- | :---: | :--- | :--- | :---: |
| **Open Palm** | ✋ | Play / Pause | Toggle Auto-Play | `Space` |
| **Two Fingers** | ✌️ | Next Track | Next Slide | `ArrowRight` |
| **Pointing** | ☝️ | Previous Track | Previous Slide | `ArrowLeft` |
| **Thumbs Up** | 👍 | Volume Up (+15%) | Positive Reaction / Confirm | `VolumeUp` |
| **Thumbs Down** | 👎 | Volume Down (-15%) | Cancel / Undo | `VolumeDown` |
| **Fist** | ✊ | Stop / Mute | Stop / Reset Presentation | `Escape` |
| **OK Sign** | 👌 | Toggle Fullscreen | Highlight Bullet Point | `Enter` |

---

## 🛠️ Built With

- **HTML5 / CSS3 / JavaScript (ES6+)**
- **ml5.js & TensorFlow.js Handpose Model**
- **Web Audio API & Web Speech Synthesis API**
- **FontAwesome & Material Design principles**
