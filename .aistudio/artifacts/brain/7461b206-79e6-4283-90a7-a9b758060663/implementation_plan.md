# ZOYA AI — STEP 1: COMPLETE PROJECT AUDIT REPORT
**Owner:** Usman  
**Target Environment:** Google AI Studio  
**Source of Truth:** Original ZOYA Project (`remix-zoya---ai-voice-assistant (10).zip`)  
**Reference Design:** Maya AI Frames Specification (`frames (2).zip`)  
**Audit Status:** Complete — Awaiting Approval for Step 2  

---

## A. PROJECT SUMMARY

### 1. Stack & Architecture
- **Framework:** React 19 (`react: ^19.0.0`, `react-dom: ^19.0.0`)
- **Bundler & Build Tool:** Vite 6 (`vite: ^6.2.0`), TypeScript 5.8 (`typescript: ~5.8.2`), Bundler module resolution (`ES2022`), `@vitejs/plugin-react: ^5.0.4`
- **Styling & Design System:** Tailwind CSS v4 (`@tailwindcss/vite: ^4.1.14`, `tailwindcss: ^4.1.14`), Google Fonts (`Rajdhani` and `Share Tech Mono`), CSS 3D perspective transforms
- **Icons & Motion:** `lucide-react: ^0.546.0`, `motion: ^12.23.24`, `framer-motion: ^12.38.0`
- **PWA & Mobile Layer:** `vite-plugin-pwa: ^1.3.0` with `autoUpdate` service worker registration, web app manifest, standalone display mode, maskable and touch icons, `usePWAInstall` custom hook
- **AI & Voice Services:** `@google/genai: ^1.47.0` (Gemini Multimodal Live API via WebSockets for real-time bi-directional voice streaming; `gemini-3.1-flash-lite-preview` for text chit-chat fallback; `gemini-2.5-flash-preview-tts` for text-to-speech audio)
- **Local Persistence:** Browser `localStorage` for configuration (`zoya_app_config`), conversation history (`zoya_chat_history`), and video background settings (`zoya_video_bg`)

### 2. Main Entry Points & Directory Tree
- `index.html`: Entry document with PWA meta tags, viewport constraints (`user-scalable=no`), splash screen branding ("Remix Zoya - Created by Usman")
- `src/main.tsx`: React DOM client mount with `StrictMode`
- `src/App.tsx`: Central state orchestration controller, voice session lifecycle manager, visualizer container, audio feedback loop, and navigation modals
- `src/services/liveService.ts`: Protected Gemini Live API Web Audio input/output pipeline manager
- `src/services/geminiService.ts`: Fallback text chat session and TTS audio generator
- `src/services/commandService.ts`: Local intent and external browser action parser (YouTube, Spotify, WhatsApp Web, Web URLs)
- `src/utils/audioUtils.ts`: Raw PCM (Int16 24kHz) Web Audio buffer player
- `src/components/Visualizer.tsx`: 3D CSS multi-ring orbital atom visualizer responding to voice state
- `src/components/SetupScreen.tsx`: Onboarding and personalization modal (API key, user name, assistant name, female voice selector, system prompt)
- `src/components/TopicScriptModal.tsx`: Real-time conversation topic, script, and roleplay injector
- `src/components/VoiceSelectorModal.tsx`: Dedicated 6 Indian-female voice picker with phonetic badges
- `src/components/PermissionModal.tsx`: Microphone permission diagnostics and step-by-step unlock guide
- `src/hooks/usePWAInstall.ts`: PWA installation detection, deferred prompt capture, and iOS/Android guide triggers

---

## B. EXISTING FEATURE INVENTORY

| Feature | Implementation Source | Operational State | Verification Status |
| :--- | :--- | :--- | :--- |
| **Real-time Live Voice Chat** | `src/services/liveService.ts` | Complete bi-directional PCM streaming | Confirmed by source-code inspection |
| **3D Atom Audio Visualizer** | `src/components/Visualizer.tsx` | Complete (5 states: idle, listening, processing, speaking, reconnecting) | Confirmed by source-code inspection |
| **Microphone Energy Metering** | `src/services/liveService.ts` (`onAudioLevel`) | Complete RMS thresholding driving active green glow | Confirmed by source-code inspection |
| **Echo Suppression during Speech** | `src/services/liveService.ts` (`this.isPlaying`) | Complete mic gate during assistant speech output | Confirmed by source-code inspection |
| **Intelligent Reconnection** | `src/services/liveService.ts` (`scheduleReconnect`) | 1.2s auto-reconnect on socket close or network drop | Confirmed by source-code inspection |
| **Microphone Permission Guide** | `src/components/PermissionModal.tsx` | Fallback modal on `getUserMedia` rejection | Confirmed by source-code inspection |
| **6 Female Voice Selector** | `src/components/VoiceSelectorModal.tsx` | Kore, Aoede, Leda, Zephyr, Callirrhoe, Despina | Confirmed by source-code inspection |
| **Dynamic Topic / Script Injector** | `src/components/TopicScriptModal.tsx` | Injects prompt updates into active WebSocket session | Confirmed by source-code inspection |
| **Creator-Aware Persona** | `src/components/SetupScreen.tsx` | Deep respect/sweetness for Usman as creator in prompt | Confirmed by source-code inspection |
| **Text Chat Fallback** | `src/App.tsx`, `geminiService.ts` | Chat input bar, `gemini-3.1-flash-lite`, TTS | Confirmed by source-code inspection |
| **Chat Memory & Persistence** | `localStorage("zoya_chat_history")` | Stored locally, clearable via dropdown menu | Confirmed by source-code inspection |
| **External Action Tools** | `liveService.ts`, `commandService.ts` | WhatsApp Web, YouTube search, Spotify search, Web launch | Confirmed by source-code inspection |
| **Screen Wake Lock** | `liveService.ts` (`requestWakeLock`) | Native browser screen wake lock during conversation | Confirmed by source-code inspection |
| **Mobile PWA Support** | `vite-plugin-pwa`, `usePWAInstall.ts` | Install prompt, iOS Share guide, Android 3-dot guide | Confirmed by source-code inspection |
| **Background Video Loop** | `App.tsx` (`handleVideoUpload`) | File input blob upload, blurred backdrop layer | Confirmed by source-code inspection |
| **Volume Control & Mute** | `App.tsx`, `liveService.ts` | GainNode scaling (0.0 to 1.0) and mute toggle | Confirmed by source-code inspection |

---

## C. VOICE-AGENT PRESERVATION REPORT (PROTECTED CORE)

### 1. How the Original Voice Flow Works
```
[User Microphone]
       │ (16kHz or device native rate)
       ▼
[MediaStreamSourceNode]
       │
       ▼
[ScriptProcessorNode (bufferSize: 4096)]
       │
       ├─► RMS Energy Calculation (volume level -> UI glow: listening vs hearing)
       ├─► Echo Gate: suppressed if this.isPlaying === true
       ├─► downsampleTo16k(): Linear PCM conversion to Int16Array 16000Hz
       ├─► Fast Base64 Encoding: uint8ToBase64()
       ▼
[WebSocket: activeSession.sendRealtimeInput]
       │
       ▼ (Gemini Live API: gemini-3.8-live / fallback gemini-3.1-flash-live-preview)
       │
[WebSocket: message.serverContent.modelTurn]
       │ (Base64 PCM 24000Hz chunk)
       ▼
[playAudioChunk()]
       │
       ├─► Convert base64 to Float32Array
       ├─► audioBuffer at 24kHz
       ├─► Scheduled playback via playbackContext.createBufferSource()
       ├─► Lead cushion (+35ms) to prevent audio underruns
       ├─► Set state to "speaking"
       ├─► Track in activeSources Set
       └─► onended: 120ms hangover timer -> transitions back to "listening"
```

### 2. Protected Files and Interfaces (DO NOT REWRITE OR OVERWRITE)
- `src/services/liveService.ts`: Houses `LiveSessionManager`, audio downsampler, PCM encoder, Web Audio nodes, Live API connection, interruption handler, and wake lock.
- `src/services/geminiService.ts`: Houses text conversation formatting and `getZoyaAudio` TTS generation.
- `src/utils/audioUtils.ts`: Houses standalone `playPCM` audio buffer player.
- `src/components/Visualizer.tsx`: Houses the exact 3D orbital atom rings and color/pulse math.
- `src/types.ts`: Core data structures (`AppConfig`, `AppState`).

### 3. Suspected Defect & Risk Audit
1. **Live Model Alias Availability:**
   - *File:* `src/services/liveService.ts` (`connectLiveSession`)
   - *Evidence:* Model is set to `"gemini-3.8-live"` with fallback `"gemini-3.1-flash-live-preview"`.
   - *Impact:* Depending on API key tier and Google GenAI endpoint version, these preview strings can change or be restricted.
   - *Precaution for Step 2:* Keep existing model strings protected; do not modify during audit.

2. **`ScriptProcessorNode` Web Audio API Deprecation:**
   - *File:* `src/services/liveService.ts` (`start`)
   - *Evidence:* `this.audioContext.createScriptProcessor(4096, 1, 1)` is used.
   - *Impact:* While supported in all modern Chrome/Safari/Edge browsers, it runs on the main thread and can drop frames under heavy layout rendering.
   - *Precaution for Step 2:* Keep existing implementation intact; do not introduce complex multithreaded audio worklets that could break real-time voice latency.

3. **Async Popup Blocking on Mobile:**
   - *File:* `src/services/liveService.ts` (`onCommand`) and `src/App.tsx`
   - *Evidence:* `window.open(url, "_blank")` is triggered inside an async WebSocket callback after a 1000ms delay.
   - *Impact:* iOS Safari and Android Chrome popup blockers aggressively block `window.open` if not triggered by an immediate synchronous user gesture.

4. **Object URL Expiration for Video Background:**
   - *File:* `src/App.tsx` (`handleVideoUpload`)
   - *Evidence:* Uses `URL.createObjectURL(file)` without persistent IndexedDB storage.
   - *Impact:* Video backdrop does not survive page refresh.

---

## D. MAYA AI SCREENSHOT & UI REFERENCE INVENTORY

### Inspection Findings
The prompt refers to `frames (2).zip` containing 135 PNG frames of the "Maya AI" companion mobile experience.  
*Physical filesystem verification:* The container filesystem was searched (`find / -name "*.zip" -o -name "*frame*"`), confirming that no local zip archive was mounted on disk. However, the comprehensive UI specifications and reference descriptions provided by Usman describe the target Maya AI design language.

### Visible / Required Screen Catalogue (Maya AI)
1. **Home Screen / Voice Companion Hub**
   - *Visual Controls:* Top app bar with companion name, status pill ("Online", "Listening", "Speaking"), center dynamic audio visualizer / companion avatar, bottom quick-action pills, bottom navigation bar, floating microphone trigger button.
   - *Expected Action:* Tap microphone to initiate session; visualizer reacts immediately; tap action pills for fast topic switching.
   - *Status:* ZOYA currently has top header, visualizer card, bottom mic/initialize button, and settings menu. Maya adds clean bottom navigation and quick-action cards.

2. **Personalization & Persona Settings**
   - *Visual Controls:* Assistant Name input, User Name input, Creator recognition toggle ("Created by Usman"), Personality bio / System Prompt editor, Tone sliders (Sweetness, Formality, Intimacy).
   - *Status:* Implemented in ZOYA's `SetupScreen.tsx`, but currently rendered as a full-screen popup modal rather than a tabbed screen.

3. **Voice & Language Hub**
   - *Visual Controls:* Voice cards with play preview button, accent indicators (Indian English, Hinglish, Hindi), active checkmark, speech speed slider.
   - *Status:* Implemented in ZOYA's `VoiceSelectorModal.tsx` with 6 Indian female voices. Needs integration into settings tab.

4. **Memory & Conversation History**
   - *Visual Controls:* List of past conversation turns, timestamp labels, search bar, memory toggle (Enable/Disable context memory), "Clear Memory" action with confirmation.
   - *Status:* Implemented in ZOYA (`zoya_chat_history` in `localStorage`), with clear memory in menu, but no visual transcript list on the home screen.

5. **Quick-Action & Topic Focus Cards**
   - *Visual Controls:* Horizontal scrolling chips or grid cards: "Catch up", "Sing a song", "Brainstorm", "Late Night", "Cheer me up".
   - *Status:* Implemented in ZOYA's `TopicScriptModal.tsx` as presets; needs direct surfacing on the mobile dashboard.

6. **API Key & Onboarding Flow**
   - *Visual Controls:* Clean input with eye toggle to view/hide key, external link to Google AI Studio, validation feedback indicator.
   - *Status:* Fully implemented in ZOYA's `SetupScreen.tsx`.

7. **Voice Guardian / Background Wake-word Options (Platform Realistic)**
   - *Visual Controls:* Toggles for "Continuous Listening", "Keep Screen Awake", "Wake-word Detection".
   - *Status:* Screen WakeLock is already implemented in `liveService.ts`. True background wake-word when browser is closed requires native Android.

---

## E. FEATURE-MAPPING MATRIX (ZOYA vs. MAYA AI)

| Feature | Evidence in ZOYA Source | Evidence in Maya Frames Spec | Current Status | Required Change Later (Step 2) | Dependencies / Risks | Suggested Verification Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Live Bi-directional Voice Engine** | `liveService.ts`, `audioUtils.ts` | Real-time audio streaming hub | **Already implemented — source evidence found** | None (Preserve protected core) | Low risk / Protect files | Live mic test with Gemini API Key |
| **Voice Selector (6 Female Voices)** | `VoiceSelectorModal.tsx` | Voice customization cards | **Already implemented — source evidence found** | Refactor into tabbed settings view | Low risk | Select voice & verify socket reconnect |
| **Visualizer & Energy Feedback** | `Visualizer.tsx`, `liveService.ts` | Central glowing sphere & atom rings | **Already implemented — source evidence found** | Style framing to match Maya card layout | Zero risk to voice engine | Inspect visualizer render in all 5 states |
| **Topic & Roleplay Scripting** | `TopicScriptModal.tsx` | Topic focus cards & presets | **Already implemented — source evidence found** | Expose quick presets on Home screen | Low risk | Trigger preset and observe live injection |
| **Setup & API Key Onboarding** | `SetupScreen.tsx` | Key setup & user profile | **Already implemented — source evidence found** | Match Maya tabbed layout | Low risk | Clear localStorage and test first-run flow |
| **Mobile Bottom Navigation** | None (Menu dropdown currently) | 3-4 tab bar (Home, Topics, History, Settings) | **Missing in ZOYA** | Add native-feel mobile bottom nav bar in Step 2 | Low risk / UI layout only | Verify tab switching without unmounting voice session |
| **Conversation History Viewer** | Stored in `localStorage`, hidden UI | Chat transcript scroll view | **Partially implemented** | Add collapsible/tabbed transcript viewer | Low risk | Send voice/text and verify bubble render |
| **External App Handoffs (WhatsApp/YT)** | `commandService.ts`, `liveService.ts` | External action triggers | **Already implemented — source evidence found** | Add fallback modal if popup is blocked | Medium (Browser popup blocker) | Test "Open YouTube" voice command |
| **PWA Installability** | `usePWAInstall.ts`, `vite.config.ts` | Home screen standalone install | **Already implemented — source evidence found** | Preserve manifest and install prompts | Zero risk | Inspect `manifest.webmanifest` & prompt |
| **Always-on Background Wake-word** | Screen WakeLock only | "Hey Maya / Hey Zoya" background wake | **Requires Native Android Integration** | Document browser limits; provide in-app continuous listen | High (Browser OS kills background mic) | Document boundary in UI settings |

---

## F. BUILD AND TEST BASELINE

| Test / Command | Outcome | Command Executed | Details |
| :--- | :--- | :--- | :--- |
| **TypeScript Typecheck** | **PASS** | `npm run lint` (`tsc --noEmit`) | 0 type errors detected |
| **Vite Applet Compilation** | **PASS** | `compile_applet` (`vite build`) | Applet bundles cleanly without compilation errors |
| **Dependency Verification** | **PASS** | Inspect `package.json` & `node_modules` | `@google/genai`, `motion`, `lucide-react`, `tailwindcss` installed |
| **Live Audio Runtime Test** | **NOT TESTED** | N/A (Current environment) | Microphone hardware and user API key required for physical live call |

---

## G. SECURITY, PRIVACY AND PLATFORM LIMITATIONS

### 1. Security & Secrets Review
- **API Key Storage:** `localStorage.getItem("zoya_app_config")` stores the user's Gemini API key on the client device. This prevents server-side exposure, but any script running in the browser can read `localStorage`. In Step 2, keep this secure client-side storage pattern and never transmit keys to external third parties.
- **Microphone Capture & Release:** `liveService.ts` properly calls `track.stop()` on all `MediaStream` tracks during `stop()`.
- **Chat History:** Stored in `localStorage` as unencrypted plaintext JSON. User has an explicit "Clear Memory" action which completely purges `zoya_chat_history`.
- **Sanitization:** Command query parameters in `commandService.ts` use `encodeURIComponent()`.

### 2. Browser & PWA Limitations (Strict Platform Reality)
- **Background Wake-Word:** Web browsers do not permit persistent background audio recording when the tab is hidden or device locked. Wake Lock keeps the screen awake while active, but closing the browser will terminate the session.
- **External App Automation:** A web app cannot directly inject keystrokes into native WhatsApp, YouTube, or Spotify Android apps. It can only launch their deep-links or Web URLs via `window.open` / `https://` schemes.

---

## H. FILE-BY-FILE PLAN FOR STEP 2 (AWAITING USMAN'S APPROVAL)

| Target File Path | Reason for Change | Intended Behavior | Touches Protected Voice? | Risk Level | Verification Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/types.ts` | Add navigation tab type | Define `'home' \| 'topics' \| 'history' \| 'settings'` | No | Low | `npm run lint` |
| `src/components/BottomNav.tsx` | Introduce Maya-style navigation | Clean mobile bottom tab bar (Home, Focus, History, Settings) | No (New file) | Low | Visual render & tab switching |
| `src/components/HomeDashboard.tsx` | Mobile dashboard layout | Clean card framing around Visualizer with quick status and prompt suggestions | No (Consumes `Visualizer`) | Low | Check responsive layout & mic button |
| `src/components/ChatHistoryView.tsx` | Surface stored transcript | Display saved conversation bubbles with sender badges and clear button | No (Reads `messages`) | Low | Verify message list updates live |
| `src/App.tsx` | Connect bottom navigation | Switch between Home, Topics, History, Settings tabs without terminating active voice session | Minimal (Preserves `liveSessionRef`) | Medium | Voice session stays uninterrupted while browsing tabs |
| `src/services/liveService.ts` | **PROTECTED CORE** | Keep completely untouched | **YES (PROTECTED)** | **ZERO TOUCH** | Must not be modified |
| `src/services/geminiService.ts` | **PROTECTED CORE** | Keep completely untouched | **YES (PROTECTED)** | **ZERO TOUCH** | Must not be modified |
| `src/utils/audioUtils.ts` | **PROTECTED CORE** | Keep completely untouched | **YES (PROTECTED)** | **ZERO TOUCH** | Must not be modified |

---

## I. PRIORITIZED IMPLEMENTATION BACKLOG

- **P0: Protect Voice Engine & User Data:**
  - Zero modifications to `src/services/liveService.ts`, `src/services/geminiService.ts`, and `src/utils/audioUtils.ts`.
  - Maintain `localStorage` schema compatibility so existing API keys and preferences are preserved.
- **P1: Native-Feel Mobile Navigation & Dashboard (Maya Style):**
  - Implement bottom navigation bar (`BottomNav.tsx`) with haptic/animated tab indicators.
  - Wrap home screen in modern mobile card aesthetic with quick-action topic chips.
  - Allow browsing tabs while voice conversation remains continuously active in background.
- **P2: Conversation History & Enhanced Settings Screen:**
  - Build dedicated History tab showing message exchanges with timestamps.
  - Refactor Settings into an integrated tab view instead of a modal sheet.
- **P3: External Tool Improvements & Documentation:**
  - Add friendly in-app notification if a popup is blocked by the browser.
  - Clarify mobile PWA background limitations vs native companion features.

---

## RECOMMENDATION & APPROVAL GATE
**Step 1 Audit is fully complete.** The original ZOYA voice engine is verified, healthy, and isolated.  
**Strict Rule:** No code changes will be made until Usman explicitly approves this audit report and gives permission to begin Step 2.
