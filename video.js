/**
 * AI Hand Detection & Gesture-Based Computer Control System
 * Real-time 21-point hand landmark tracking and gesture classification.
 */

// ======================= STATE & DOM REFS =======================
const video = document.getElementById("video");
const c1 = document.getElementById("c1");
const ctx1 = c1.getContext("2d");

// UI Indicators
const cameraStatusText = document.getElementById("cameraStatusText");
const cameraDot = document.getElementById("cameraDot");
const modelStatusText = document.getElementById("modelStatusText");
const modelDot = document.getElementById("modelDot");
const activeModeText = document.getElementById("activeModeText");
const loadingScreen = document.getElementById("loadingScreen");
const loadingStatus = document.getElementById("loadingStatus");

// Controls & Inputs
const aiToggle = document.getElementById("aiToggle");
const aiToggleLabel = document.getElementById("aiToggleLabel");
const voiceToggle = document.getElementById("voiceToggle");
const sfxToggle = document.getElementById("sfxToggle");
const fpsInput = document.getElementById("fpsInput");
const fpsVal = document.getElementById("fpsVal");
const cooldownInput = document.getElementById("cooldownInput");
const cooldownVal = document.getElementById("cooldownVal");

// HUD
const liveGestureBadge = document.getElementById("liveGestureBadge");
const gestureIcon = document.getElementById("gestureIcon");
const gestureName = document.getElementById("gestureName");
const cooldownBar = document.getElementById("cooldownBar");
const actionFlash = document.getElementById("actionFlash");
const actionFlashText = document.getElementById("actionFlashText");

// Media Player Elements
const mediaVideoPlayer = document.getElementById("mediaVideoPlayer");
const playerStateText = document.getElementById("playerStateText");
const volumeIcon = document.getElementById("volumeIcon");
const volumeLevelText = document.getElementById("volumeLevelText");
const videoProgressBar = document.getElementById("videoProgressBar");
const videoProgressFill = document.getElementById("videoProgressFill");
const playBtnIcon = document.getElementById("playBtnIcon");
const nowPlayingTitle = document.getElementById("nowPlayingTitle");

// Slides Elements
const slidesContainer = document.getElementById("slidesContainer");
const slideCounterText = document.getElementById("slideCounterText");

// Terminal Log
const terminalLog = document.getElementById("terminalLog");
const testInputArea = document.getElementById("testInputArea");

// System State
let modelIsLoaded = false;
let cameraAvailable = false;
let aiEnabled = false;
let fps = 30;
let lastFrameTime = 0;
let isPredicting = false;

let activeTab = "tab-media"; // tab-media | tab-slides | tab-system
let currentGesture = "None";
let gestureConfidence = 0;
let lastTriggerTime = 0;
let triggerCooldownMs = 900;
let consecutiveGestureCount = 0;
let candidateGesture = "";

// Media playlist
const playlist = [
    { title: "Big Buck Bunny Animation", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
    { title: "Elephant's Dream Sci-Fi", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
    { title: "For Bigger Blazes Demo", src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" }
];
let currentMediaIndex = 0;

// Slides state
let currentSlideIndex = 1;
const totalSlides = 4;

// Audio Context for synthesized sound FX
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

// Play synthesizer sound effect
function playTone(freq, duration, type = "sine") {
    if (!sfxToggle.checked) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.error("Audio error", e);
    }
}

// Voice synthesis feedback
function speakAction(text) {
    if (!voiceToggle.checked) return;
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // cancel pending speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
    }
}

// ======================= CAMERA INITIALIZATION =======================
const constraints = {
    audio: false,
    video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 }
    }
};

function initCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        loadingStatus.innerText = "getUserMedia not supported in this browser.";
        return;
    }

    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        cameraAvailable = true;
        video.srcObject = stream;
        cameraDot.className = "status-dot active";
        cameraStatusText.innerText = "Camera: Active";
        checkAllReady();
    }).catch(function (err) {
        cameraAvailable = false;
        cameraDot.className = "status-dot warning";
        cameraStatusText.innerText = "Camera: Permission Denied";
        loadingStatus.innerText = "Please allow webcam access to use hand gestures.";
        setTimeout(initCamera, 2000);
    });
}

// ======================= ML5 HANDPOSE INITIALIZATION =======================
let handpose = null;

try {
    handpose = ml5.handpose({}, { flipHorizontal: false }, onModelLoaded);
} catch (e) {
    console.error("Handpose load error:", e);
    loadingStatus.innerText = "Error loading AI model.";
}

function onModelLoaded() {
    console.log("ml5 Handpose Model Loaded!");
    // Warm up model with dummy image
    const dummyImg = document.getElementById("img");
    if (dummyImg && handpose) {
        handpose.predict(dummyImg, () => {
            modelIsLoaded = true;
            modelDot.className = "status-dot active";
            modelStatusText.innerText = "Model: AI Ready";
            checkAllReady();
        });
    } else {
        modelIsLoaded = true;
        modelDot.className = "status-dot active";
        modelStatusText.innerText = "Model: AI Ready";
        checkAllReady();
    }
}

function checkAllReady() {
    if (modelIsLoaded && cameraAvailable) {
        loadingScreen.style.opacity = "0";
        setTimeout(() => {
            loadingScreen.style.display = "none";
        }, 400);
        aiToggle.disabled = false;
        aiToggle.checked = true;
        aiEnabled = true;
        aiToggleLabel.innerText = "AI Active";
        aiToggleLabel.style.color = "var(--accent-green)";
        logTerminal("AI Handpose model initialized and ready.");
    }
}

// ======================= MAIN LOOP =======================
function renderLoop(timestamp) {
    requestAnimationFrame(renderLoop);

    if (!cameraAvailable || video.readyState < 2) return;

    // Check FPS interval
    const interval = 1000 / fps;
    if (timestamp - lastFrameTime < interval) return;
    lastFrameTime = timestamp;

    // Update canvas dimensions
    if (c1.width !== video.videoWidth || c1.height !== video.videoHeight) {
        c1.width = video.videoWidth || 640;
        c1.height = video.videoHeight || 480;
    }

    // Draw video feed
    ctx1.drawImage(video, 0, 0, c1.width, c1.height);

    // Update cooldown bar UI
    updateCooldownHUD();

    // Run AI prediction
    if (aiEnabled && modelIsLoaded && !isPredicting) {
        isPredicting = true;
        handpose.predict(c1, results => {
            isPredicting = false;
            if (results && results.length > 0) {
                const hand = results[0];
                drawHandSkeleton(hand);
                const gesture = classifyHandGesture(hand);
                processGesture(gesture);
            } else {
                handleNoHand();
            }
        });
    }
}

// Start loop
initCamera();
requestAnimationFrame(renderLoop);

// ======================= SKELETON VISUALIZATION =======================
function drawHandSkeleton(hand) {
    const landmarks = hand.landmarks;
    const annotations = hand.annotations;

    // 1. Draw glowing connecting bones
    ctx1.lineWidth = 3;
    ctx1.lineCap = "round";
    ctx1.lineJoin = "round";

    const fingerKeys = [
        { key: "thumb", color: "#f59e0b" },
        { key: "indexFinger", color: "#06b6d4" },
        { key: "middleFinger", color: "#3b82f6" },
        { key: "ringFinger", color: "#8b5cf6" },
        { key: "pinky", color: "#ec4899" }
    ];

    fingerKeys.forEach(finger => {
        const points = annotations[finger.key];
        if (points && points.length > 0) {
            // Connect to wrist
            ctx1.beginPath();
            ctx1.strokeStyle = "rgba(99, 102, 241, 0.6)";
            ctx1.moveTo(landmarks[0][0], landmarks[0][1]);
            ctx1.lineTo(points[0][0], points[0][1]);
            ctx1.stroke();

            // Connect finger joints
            ctx1.beginPath();
            ctx1.strokeStyle = finger.color;
            ctx1.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) {
                ctx1.lineTo(points[i][0], points[i][1]);
            }
            ctx1.stroke();
        }
    });

    // 2. Draw Palm Base
    if (landmarks[0]) {
        ctx1.beginPath();
        ctx1.arc(landmarks[0][0], landmarks[0][1], 8, 0, 2 * Math.PI);
        ctx1.fillStyle = "#6366f1";
        ctx1.fill();
        ctx1.strokeStyle = "#ffffff";
        ctx1.lineWidth = 2;
        ctx1.stroke();
    }

    // 3. Draw glowing landmark keypoints
    for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        const isTip = (i === 4 || i === 8 || i === 12 || i === 16 || i === 20);

        ctx1.beginPath();
        ctx1.arc(pt[0], pt[1], isTip ? 6 : 4, 0, 2 * Math.PI);
        ctx1.fillStyle = isTip ? "#10b981" : "#ffffff";
        ctx1.fill();
        ctx1.strokeStyle = isTip ? "#ffffff" : "#3b82f6";
        ctx1.lineWidth = 1.5;
        ctx1.stroke();
    }

    // 4. Draw bounding box with gesture label
    if (hand.boundingBox) {
        const { topLeft, bottomRight } = hand.boundingBox;
        const width = bottomRight[0] - topLeft[0];
        const height = bottomRight[1] - topLeft[1];

        ctx1.strokeStyle = "rgba(6, 182, 212, 0.7)";
        ctx1.lineWidth = 2;
        ctx1.strokeRect(topLeft[0], topLeft[1], width, height);

        // Header label box
        if (currentGesture && currentGesture !== "None") {
            ctx1.fillStyle = "rgba(15, 23, 42, 0.85)";
            ctx1.fillRect(topLeft[0], Math.max(0, topLeft[1] - 26), Math.max(width, 140), 24);
            ctx1.fillStyle = "#06b6d4";
            ctx1.font = "bold 13px 'Segoe UI', sans-serif";
            ctx1.fillText(`${currentGesture}`, topLeft[0] + 6, Math.max(16, topLeft[1] - 9));
        }
    }
}

// ======================= ROBUST GESTURE CLASSIFIER =======================
function dist(p1, p2) {
    if (!p1 || !p2) return 0;
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    const dz = (p1[2] || 0) - (p2[2] || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function classifyHandGesture(hand) {
    const lm = hand.landmarks;
    if (!lm || lm.length < 21) return { name: "None", confidence: 0 };

    // Keypoints:
    // Wrist: 0
    // Thumb: 1 (CMC), 2 (MCP), 3 (IP), 4 (Tip)
    // Index: 5 (MCP), 6 (PIP), 7 (DIP), 8 (Tip)
    // Middle: 9 (MCP), 10 (PIP), 11 (DIP), 12 (Tip)
    // Ring: 13 (MCP), 14 (PIP), 15 (DIP), 16 (Tip)
    // Pinky: 17 (MCP), 18 (PIP), 19 (DIP), 20 (Tip)

    const wrist = lm[0];
    const palmSize = dist(wrist, lm[9]); // Wrist to Middle MCP (scale reference)
    if (palmSize === 0) return { name: "None", confidence: 0 };

    // Check extension of 4 main fingers
    // A finger is extended if tip is far from wrist compared to PIP, and tip is far from MCP
    function isFingerExtended(tipIdx, pipIdx, mcpIdx) {
        const tipToWrist = dist(lm[tipIdx], wrist);
        const pipToWrist = dist(lm[pipIdx], wrist);
        const tipToMcp = dist(lm[tipIdx], lm[mcpIdx]);
        const pipToMcp = dist(lm[pipIdx], lm[mcpIdx]);
        return (tipToWrist > pipToWrist * 1.08) && (tipToMcp > pipToMcp * 0.9);
    }

    const indexExtended = isFingerExtended(8, 6, 5);
    const middleExtended = isFingerExtended(12, 10, 9);
    const ringExtended = isFingerExtended(16, 14, 13);
    const pinkyExtended = isFingerExtended(20, 18, 17);

    // Thumb extension & orientation
    const thumbTip = lm[4];
    const thumbIP = lm[3];
    const thumbMCP = lm[2];
    const pinkyMCP = lm[17];

    const thumbExtendedAway = dist(thumbTip, pinkyMCP) > dist(thumbIP, pinkyMCP) * 1.15;
    const thumbDy = thumbTip[1] - thumbMCP[1]; // Negative = pointing UP, Positive = pointing DOWN
    const isThumbUp = thumbDy < -palmSize * 0.35;
    const isThumbDown = thumbDy > palmSize * 0.35;

    // Check pinch (Thumb Tip to Index Tip)
    const pinchDist = dist(thumbTip, lm[8]);
    const isPinching = pinchDist < palmSize * 0.38;

    // Extended finger counts
    const extendedCount = (indexExtended ? 1 : 0) + (middleExtended ? 1 : 0) + (ringExtended ? 1 : 0) + (pinkyExtended ? 1 : 0);

    // 1. OK Gesture 👌:
    // Thumb and Index tips touch, Middle and Ring fingers are extended (or at least Middle)
    if (isPinching && middleExtended && !pinkyExtended) {
        return { name: "OK Gesture", icon: "👌", confidence: 0.92 };
    }
    if (isPinching && (middleExtended || ringExtended)) {
        return { name: "OK Gesture", icon: "👌", confidence: 0.90 };
    }

    // 2. Thumbs Up 👍:
    // Thumb points up, all other 4 fingers are folded
    if (isThumbUp && extendedCount === 0) {
        return { name: "Thumbs Up", icon: "👍", confidence: 0.95 };
    }

    // 3. Thumbs Down 👎:
    // Thumb points down, all other 4 fingers are folded
    if (isThumbDown && extendedCount === 0) {
        return { name: "Thumbs Down", icon: "👎", confidence: 0.94 };
    }

    // 4. Fist ✊:
    // All 4 fingers folded, thumb close to fingers / not extended up/down
    if (extendedCount === 0 && !isThumbUp && !isThumbDown) {
        return { name: "Fist", icon: "✊", confidence: 0.93 };
    }

    // 5. Pointing ☝️:
    // Only index finger extended
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
        return { name: "Pointing", icon: "☝️", confidence: 0.91 };
    }

    // 6. Two Fingers (Peace / Victory) ✌️:
    // Index and Middle extended, Ring and Pinky folded
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
        return { name: "Two Fingers", icon: "✌️", confidence: 0.95 };
    }

    // 7. Open Palm ✋:
    // All 4 fingers extended, thumb extended away
    if (extendedCount >= 4) {
        return { name: "Open Palm", icon: "✋", confidence: 0.96 };
    }

    return { name: "Detecting...", icon: "🖐️", confidence: 0.5 };
}

// ======================= GESTURE PROCESSING & COOLDOWN =======================
function processGesture(gestureObj) {
    currentGesture = gestureObj.name;
    gestureConfidence = gestureObj.confidence;

    // Update Live HUD
    if (gestureObj.name !== "None" && gestureObj.name !== "Detecting...") {
        gestureIcon.innerText = gestureObj.icon || "✋";
        gestureName.innerText = `${gestureObj.name}`;
        liveGestureBadge.classList.add("active");
        highlightGestureCard(gestureObj.name);
    } else {
        liveGestureBadge.classList.remove("active");
        highlightGestureCard("");
    }

    // Debounce & Stability filter: require 2 consecutive frames of the same valid gesture
    if (gestureObj.name === candidateGesture && gestureObj.name !== "None" && gestureObj.name !== "Detecting...") {
        consecutiveGestureCount++;
    } else {
        candidateGesture = gestureObj.name;
        consecutiveGestureCount = 1;
    }

    const now = Date.now();
    const canTrigger = (now - lastTriggerTime) >= triggerCooldownMs;

    if (canTrigger && consecutiveGestureCount >= 2) {
        executeGestureAction(gestureObj.name);
        lastTriggerTime = now;
        consecutiveGestureCount = 0;
    }
}

function handleNoHand() {
    currentGesture = "None";
    gestureName.innerText = "No hand in frame";
    gestureIcon.innerText = "🔍";
    liveGestureBadge.classList.remove("active");
    highlightGestureCard("");
}

function updateCooldownHUD() {
    const elapsed = Date.now() - lastTriggerTime;
    const pct = Math.min(100, (elapsed / triggerCooldownMs) * 100);
    cooldownBar.style.width = `${pct}%`;
    if (pct < 100) {
        cooldownBar.style.backgroundColor = "var(--accent-amber)";
    } else {
        cooldownBar.style.backgroundColor = "var(--accent-cyan)";
    }
}

function highlightGestureCard(gestureName) {
    const cards = document.querySelectorAll(".gesture-card");
    cards.forEach(card => {
        if (card.getAttribute("data-gesture") === gestureName) {
            card.classList.add("highlight");
        } else {
            card.classList.remove("highlight");
        }
    });
}

// ======================= COMPUTER ACTION DISPATCHER =======================
function executeGestureAction(gesture) {
    let actionDesc = "";

    switch (gesture) {
        case "Open Palm":
            // Play / Pause
            if (activeTab === "tab-media") {
                togglePlayPauseMedia();
                actionDesc = mediaVideoPlayer.paused ? "Media Paused ⏸" : "Media Playing ▶";
            } else if (activeTab === "tab-slides") {
                actionDesc = "Presentation: Auto-Play Toggled";
            }
            triggerVirtualKey("key-space");
            playTone(520, 0.15, "triangle");
            speakAction(mediaVideoPlayer.paused ? "Pause" : "Play");
            break;

        case "Two Fingers":
            // Next item / slide
            if (activeTab === "tab-media") {
                nextMediaTrack();
                actionDesc = `Next Track: ${playlist[currentMediaIndex].title}`;
            } else if (activeTab === "tab-slides") {
                nextSlide();
                actionDesc = `Next Slide: Slide ${currentSlideIndex} of ${totalSlides}`;
            }
            triggerVirtualKey("key-arrowright");
            playTone(680, 0.12, "sine");
            speakAction("Next");
            break;

        case "Pointing":
            // Previous item / slide
            if (activeTab === "tab-media") {
                prevMediaTrack();
                actionDesc = `Prev Track: ${playlist[currentMediaIndex].title}`;
            } else if (activeTab === "tab-slides") {
                prevSlide();
                actionDesc = `Previous Slide: Slide ${currentSlideIndex} of ${totalSlides}`;
            }
            triggerVirtualKey("key-arrowleft");
            playTone(440, 0.12, "sine");
            speakAction("Previous");
            break;

        case "Thumbs Up":
            // Confirm / Volume Up
            if (activeTab === "tab-media") {
                adjustVolume(0.15);
                actionDesc = `Volume Up: ${Math.round(mediaVideoPlayer.volume * 100)}%`;
            } else if (activeTab === "tab-slides") {
                actionDesc = "Slide Reaction: Confirmed 👍";
            }
            triggerVirtualKey("key-volumeup");
            playTone(880, 0.18, "sine");
            speakAction("Volume Up");
            break;

        case "Thumbs Down":
            // Cancel / Volume Down
            if (activeTab === "tab-media") {
                adjustVolume(-0.15);
                actionDesc = `Volume Down: ${Math.round(mediaVideoPlayer.volume * 100)}%`;
            } else if (activeTab === "tab-slides") {
                actionDesc = "Slide Action: Cancelled 👎";
            }
            triggerVirtualKey("key-volumedown");
            playTone(330, 0.18, "sawtooth");
            speakAction("Volume Down");
            break;

        case "Fist":
            // Stop / Mute
            if (activeTab === "tab-media") {
                stopMedia();
                actionDesc = "Media Stopped ⏹";
            } else if (activeTab === "tab-slides") {
                actionDesc = "Presentation Stopped ⏹";
            }
            triggerVirtualKey("key-escape");
            playTone(220, 0.25, "square");
            speakAction("Stop");
            break;

        case "OK Gesture":
            // Select / Enter / Fullscreen
            if (activeTab === "tab-media") {
                toggleMediaFullscreen();
                actionDesc = "Toggled Fullscreen / Select OK 👌";
            } else if (activeTab === "tab-slides") {
                selectNextBullet();
                actionDesc = "Selected Bullet Point 👌";
            }
            triggerVirtualKey("key-enter");
            playTone(750, 0.15, "sine");
            speakAction("Select");
            break;

        default:
            return;
    }

    // Flash Action Banner on Canvas HUD
    showActionFlash(actionDesc);

    // Log to Terminal
    logTerminal(`[${gesture}] -> ${actionDesc}`);
}

function showActionFlash(text) {
    actionFlashText.innerText = text;
    actionFlash.classList.add("show");
    setTimeout(() => {
        actionFlash.classList.remove("show");
    }, 1200);
}

function logTerminal(message) {
    const timeStr = new Date().toLocaleTimeString();
    const entry = document.createElement("div");
    entry.className = "terminal-entry";
    entry.innerHTML = `<span class="terminal-time">[${timeStr}]</span> <span class="terminal-action">${message}</span>`;
    terminalLog.appendChild(entry);
    terminalLog.scrollTop = terminalLog.scrollHeight;
}

// ======================= MEDIA CONTROLLER =======================
function togglePlayPauseMedia() {
    if (mediaVideoPlayer.paused) {
        mediaVideoPlayer.play().catch(e => console.log("Auto-play constraint", e));
        playerStateText.innerHTML = '<i class="fa-solid fa-play"></i> Playing';
        playBtnIcon.className = "fa-solid fa-pause";
    } else {
        mediaVideoPlayer.pause();
        playerStateText.innerHTML = '<i class="fa-solid fa-pause"></i> Paused';
        playBtnIcon.className = "fa-solid fa-play";
    }
}

function stopMedia() {
    mediaVideoPlayer.pause();
    mediaVideoPlayer.currentTime = 0;
    playerStateText.innerHTML = '<i class="fa-solid fa-stop"></i> Stopped';
    playBtnIcon.className = "fa-solid fa-play";
}

function adjustVolume(delta) {
    let newVol = Math.max(0, Math.min(1, mediaVideoPlayer.volume + delta));
    mediaVideoPlayer.volume = newVol;
    const volPercent = Math.round(newVol * 100);
    volumeLevelText.innerText = `${volPercent}%`;

    if (newVol === 0) {
        volumeIcon.className = "fa-solid fa-volume-xmark";
    } else if (newVol < 0.5) {
        volumeIcon.className = "fa-solid fa-volume-low";
    } else {
        volumeIcon.className = "fa-solid fa-volume-high";
    }
}

function nextMediaTrack() {
    currentMediaIndex = (currentMediaIndex + 1) % playlist.length;
    loadMediaTrack(currentMediaIndex);
}

function prevMediaTrack() {
    currentMediaIndex = (currentMediaIndex - 1 + playlist.length) % playlist.length;
    loadMediaTrack(currentMediaIndex);
}

function loadMediaTrack(idx) {
    currentMediaIndex = idx;
    mediaVideoPlayer.src = playlist[idx].src;
    nowPlayingTitle.innerText = playlist[idx].title;
    mediaVideoPlayer.play().catch(e => console.log(e));
    playerStateText.innerHTML = '<i class="fa-solid fa-play"></i> Playing';
    playBtnIcon.className = "fa-solid fa-pause";
}

function toggleMediaFullscreen() {
    if (!document.fullscreenElement) {
        if (mediaVideoPlayer.requestFullscreen) {
            mediaVideoPlayer.requestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Media player progress bar listener
mediaVideoPlayer.addEventListener("timeupdate", () => {
    if (mediaVideoPlayer.duration) {
        const pct = (mediaVideoPlayer.currentTime / mediaVideoPlayer.duration) * 100;
        videoProgressFill.style.width = `${pct}%`;
    }
});

// UI Buttons for Media Player
document.getElementById("btnPlayMedia").addEventListener("click", togglePlayPauseMedia);
document.getElementById("btnStopMedia").addEventListener("click", stopMedia);
document.getElementById("btnNextMedia").addEventListener("click", nextMediaTrack);
document.getElementById("btnPrevMedia").addEventListener("click", prevMediaTrack);
document.getElementById("btnVolUp").addEventListener("click", () => adjustVolume(0.15));
document.getElementById("btnVolDown").addEventListener("click", () => adjustVolume(-0.15));
document.getElementById("btnFullscreen").addEventListener("click", toggleMediaFullscreen);
document.getElementById("btnLoadSample1").addEventListener("click", () => loadMediaTrack(0));
document.getElementById("btnLoadSample2").addEventListener("click", () => loadMediaTrack(1));

// ======================= PRESENTATION SLIDES CONTROLLER =======================
function showSlide(index) {
    currentSlideIndex = Math.max(1, Math.min(totalSlides, index));
    const slides = document.querySelectorAll(".slide-item");
    slides.forEach(slide => {
        if (parseInt(slide.getAttribute("data-index")) === currentSlideIndex) {
            slide.classList.add("active");
        } else {
            slide.classList.remove("active");
        }
    });
    slideCounterText.innerText = `Slide ${currentSlideIndex} / ${totalSlides}`;
}

function nextSlide() {
    if (currentSlideIndex < totalSlides) {
        showSlide(currentSlideIndex + 1);
    } else {
        showSlide(1); // loop back to first slide
    }
}

function prevSlide() {
    if (currentSlideIndex > 1) {
        showSlide(currentSlideIndex - 1);
    }
}

function selectNextBullet() {
    const activeSlide = document.querySelector(`.slide-item[data-index="${currentSlideIndex}"]`);
    if (!activeSlide) return;
    const bullets = activeSlide.querySelectorAll(".slide-bullets li");
    if (!bullets.length) return;

    let selectedIdx = -1;
    bullets.forEach((b, i) => {
        if (b.classList.contains("selected")) selectedIdx = i;
        b.classList.remove("selected");
    });

    const nextIdx = (selectedIdx + 1) % bullets.length;
    bullets[nextIdx].classList.add("selected");
}

document.getElementById("btnNextSlide").addEventListener("click", nextSlide);
document.getElementById("btnPrevSlide").addEventListener("click", prevSlide);
document.getElementById("btnSelectBullet").addEventListener("click", selectNextBullet);

// ======================= VIRTUAL KEYBOARD SIMULATOR =======================
function triggerVirtualKey(keyElementId) {
    const el = document.getElementById(keyElementId);
    if (el) {
        el.classList.add("pressed");
        setTimeout(() => el.classList.remove("pressed"), 300);
    }

    if (testInputArea) {
        testInputArea.value = `Triggered [${keyElementId.replace("key-", "").toUpperCase()}] via Hand Gesture`;
    }
}

// ======================= TABS & CONTROLS LISTENERS =======================
const tabBtns = document.querySelectorAll(".tab-btn");
tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const tabTarget = btn.getAttribute("data-tab");
        activeTab = tabTarget;

        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
        const targetContent = document.getElementById(tabTarget);
        if (targetContent) targetContent.classList.add("active");

        // Update header badge
        if (tabTarget === "tab-media") activeModeText.innerText = "Media Mode";
        else if (tabTarget === "tab-slides") activeModeText.innerText = "Presentation Mode";
        else if (tabTarget === "tab-system") activeModeText.innerText = "System Key Mode";

        logTerminal(`Switched active mode to ${activeModeText.innerText}`);
    });
});

aiToggle.addEventListener("change", () => {
    aiEnabled = aiToggle.checked;
    aiToggleLabel.innerText = aiEnabled ? "AI Active" : "Disabled";
    aiToggleLabel.style.color = aiEnabled ? "var(--accent-green)" : "var(--text-muted)";
    logTerminal(`AI Detection ${aiEnabled ? "Enabled" : "Disabled"}`);
});

fpsInput.addEventListener("input", (e) => {
    fps = parseInt(e.target.value);
    fpsVal.innerText = `${fps} FPS`;
});

cooldownInput.addEventListener("input", (e) => {
    triggerCooldownMs = parseInt(e.target.value);
    cooldownVal.innerText = `${(triggerCooldownMs / 1000).toFixed(1)}s`;
});

document.getElementById("btnClearLog").addEventListener("click", () => {
    terminalLog.innerHTML = "";
    logTerminal("Terminal cleared.");
});