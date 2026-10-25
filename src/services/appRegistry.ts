export type FeatureStatus =
  | "implemented"
  | "permission-required"
  | "planned"
  | "native-only"
  | "unavailable-on-web";

export type FeatureCategory =
  | "voice"
  | "interaction"
  | "tools"
  | "system"
  | "customization"
  | "content-creator"
  | "native-companion";

export interface FeatureItem {
  id: string;
  name: string;
  category: FeatureCategory;
  purpose: string;
  status: FeatureStatus;
  requiredPermissions: string[];
  supportedAction: string;
  details: string;
}

export interface UIControlItem {
  id: string;
  label: string;
  icon?: string;
  screen: "home" | "chat" | "tools" | "topics" | "settings" | "diagnostics" | "android" | "global";
  location: "header" | "center" | "chips" | "bottom" | "nav" | "modal";
  description: string;
  realAction: string;
}

export const IMPLEMENTED_FEATURES: FeatureItem[] = [
  // 1. Voice & Audio
  {
    id: "voice-live",
    name: "Real-Time Bi-Directional Live Voice (Gemini 3.8 Live)",
    category: "voice",
    purpose: "Fluid, low-latency spoken conversation with natural vocal cadence, emotional intimacy, and instant interruption.",
    status: "permission-required",
    requiredPermissions: ["Browser Microphone Permission"],
    supportedAction: "Connects to Gemini Multimodal Live WebSocket API with 16kHz PCM audio streaming & downsampler.",
    details: "Activated strictly via explicit 'Talk to Zoya' mic button or center visualizer tap. OFF cleanly terminates mic stream, AudioContext, and playback.",
  },
  {
    id: "voice-selector",
    name: "Natural Sweet Voice Timbre Selection",
    category: "voice",
    purpose: "Switch assistant female voice timbre (Kore, Fenrir, Puck, Aoede, Charon) with warm emotional presence.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Configures voiceConfig in Gemini Live and TTS sessions. Preserves current selection across restarts.",
    details: "Kore is the default warm, sweet, romantic timbre. Re-applies smoothly to active voice pipeline.",
  },

  // 2. Interaction & Scenario Modes
  {
    id: "mode-selection",
    name: "Scenario & Conversational Modes (Silent Context Update)",
    category: "interaction",
    purpose: "Switch conversational context and roleplay tone without automatic speaking or unprompted actions.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Updates active conversation prompt context in memory and displays a confirmation toast. Never auto-speaks.",
    details: "Includes Sweet chat (💖), Brainstorm (💡), Late night (🌙), Sing song (🎶), Catch up (☕), and custom topics via More (✨).",
  },
  {
    id: "chat-history-memory",
    name: "Persistent Dialogue History & Structured Memory Vault",
    category: "interaction",
    purpose: "Maintain multi-turn conversation memory and structured facts (preferences, projects, creator identity) across sessions.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Stores dialogue history and structured facts in LocalStorage with full edit, add, delete, JSON export, and clear controls.",
    details: "Facts are seamlessly woven into Zoya's system prompt so she remembers Usman's projects, channel strategies, and personal preferences.",
  },

  // 3. Multi-Key Manager & Free Tier First
  {
    id: "multi-key-manager",
    name: "Multi-Key Vault & Free-Tier Auto-Rotation",
    category: "system",
    purpose: "Provide unlimited API key registration with zero-downtime auto-rotation when free-tier rate limits (HTTP 429) are reached.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Obfuscated vault storage, priority queue rotation across Gemini, Groq, OpenRouter, and live health validation.",
    details: "Free-tier first design ensures the creator can run without unexpected charges. Rotates seamlessly when a key hits quota.",
  },

  // 4. Content Creator Assistance (YouTube, TikTok, Facebook)
  {
    id: "content-creator-suite",
    name: "Multi-Platform Content Creator Studio (YouTube, TikTok, Facebook)",
    category: "content-creator",
    purpose: "Assist creator Usman with viral video hooks, thumbnail titles, script outlines, audience retention strategies, and burnout relief.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Generates high-converting content frameworks, short-form script pacing, and emotional encouragement.",
    details: "Specialized prompt tuning tailored for multi-channel creators juggling daily uploads on YouTube, TikTok, and Facebook.",
  },

  // 5. Browser Actions & Verified Drafts (Strict Honesty)
  {
    id: "browser-actions",
    name: "Browser Actions & Media Integrations (Draft Prepared / Link Opened)",
    category: "tools",
    purpose: "Prepare verified external actions for WhatsApp drafts, YouTube search, Spotify music, and website URLs.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Generates verified action links (Draft Prepared / Opened). Never falsely claims direct automated sending.",
    details: "WhatsApp opens web.whatsapp.com with a prefilled message draft for user review. YouTube and Spotify open targeted search queries.",
  },
  {
    id: "live-weather",
    name: "Live Global Weather Lookup (Open-Meteo API)",
    category: "tools",
    purpose: "Retrieve live meteorological conditions for any city worldwide with real forecast metrics.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Fetches live temperature, humidity, wind speed, and weather condition codes from Open-Meteo REST API.",
    details: "Works with any valid city name with automatic request deduplication and race condition guards.",
  },

  // 6. System Diagnostics & PWA
  {
    id: "diagnostics",
    name: "System Diagnostics & Latency Health Check",
    category: "system",
    purpose: "Inspect audio hardware, Web Audio API support, network status, speaker output, and API key response latency.",
    status: "implemented",
    requiredPermissions: ["Microphone (optional test)"],
    supportedAction: "Runs browser capability checks, audio tone generator, mic level meter, and live round-trip latency benchmark.",
    details: "Accessible via the Activity pulse icon in the header or through the Diagnostics tab.",
  },
  {
    id: "pwa-install",
    name: "Progressive Web App (PWA) Offline & Install",
    category: "system",
    purpose: "Install ZOYA AI to phone or desktop home screen with standalone window support.",
    status: "implemented",
    requiredPermissions: [],
    supportedAction: "Triggers browser BeforeInstallPrompt on Android/desktop, provides iOS Safari Share guide, and registers Service Worker.",
    details: "Supports one-tap cache refresh and force-update from Settings.",
  },

  // 7. Subordinate Agent Joey
  {
    id: "joey-subordinate-agent",
    name: "Joey (Subordinate PC Agent)",
    category: "system",
    purpose: "Desktop companion agent subordinate to Supreme Brain Zoya for heavy video rendering, PC automation, and local file sync.",
    status: "planned",
    requiredPermissions: ["Local Desktop Socket / Electron Bridge"],
    supportedAction: "Planned for PC companion phase. Zoya remains the Supreme Brain / Main decision-maker.",
    details: "Under architectural design. Joey reports directly to Zoya as the subordinate worker node.",
  },

  // 8. Native Android Companion Only Features (Strict Honesty & Sandbox Limits)
  {
    id: "native-screen-reading",
    name: "Screen Reading & UI Element Inspection",
    category: "native-companion",
    purpose: "Inspect what is on the user's phone screen across third-party apps.",
    status: "native-only",
    requiredPermissions: ["Android AccessibilityService", "MediaProjection API"],
    supportedAction: "Unavailable in web browser sandbox. Web browsers cannot read other apps' screen pixels or view hierarchies.",
    details: "Requires the Native Android Companion App (Kotlin/Jetpack Compose) using AccessibilityNodeInfo tree parsing.",
  },
  {
    id: "native-ui-clicking",
    name: "UI Clicking & Button Automation",
    category: "native-companion",
    purpose: "Autonomously tap buttons, enter text into other apps, or click screen controls.",
    status: "native-only",
    requiredPermissions: ["Android AccessibilityService (canPerformGestures)"],
    supportedAction: "Unavailable in web browser sandbox. Web browsers cannot inject touch events or click buttons outside their own tab.",
    details: "Requires Native Android Companion App with dispatchGesture() coordinates or AccessibilityNodeInfo.ACTION_CLICK.",
  },
  {
    id: "native-touch-automation",
    name: "Touch Automation & Swipe Gestures",
    category: "native-companion",
    purpose: "Automate gestures, scroll feeds, swipe videos, or drag items across apps.",
    status: "native-only",
    requiredPermissions: ["Android AccessibilityService GestureDescription"],
    supportedAction: "Unavailable in web browser sandbox. Web apps cannot control the phone digitizer or simulate touch strokes.",
    details: "Requires Native Android Companion App using GestureDescription.StrokeDescription with precise screen coordinates.",
  },
  {
    id: "native-boot-start",
    name: "Boot Start & Continuous Background Operation",
    category: "native-companion",
    purpose: "Automatically launch the AI companion daemon when the Android phone powers on.",
    status: "native-only",
    requiredPermissions: ["android.permission.RECEIVE_BOOT_COMPLETED", "FOREGROUND_SERVICE"],
    supportedAction: "Unavailable in web browser sandbox. Web browsers cannot auto-start on device power-on without user action.",
    details: "Requires Native Android Companion App with BootReceiver BroadcastReceiver and sticky ForegroundService.",
  },
  {
    id: "native-notification-reading",
    name: "Notification Reading & Message Intercept",
    category: "native-companion",
    purpose: "Read incoming notifications from WhatsApp, Instagram, YouTube Studio, and SMS in real time.",
    status: "native-only",
    requiredPermissions: ["NotificationListenerService (BIND_NOTIFICATION_LISTENER_SERVICE)"],
    supportedAction: "Unavailable in web browser sandbox. Web browsers have zero access to device notifications from third-party apps.",
    details: "Requires Native Android Companion App with NotificationListenerService.onNotificationPosted() parsing.",
  },
  {
    id: "native-call-control",
    name: "GSM Telephony & Call Control",
    category: "native-companion",
    purpose: "Directly answer incoming phone calls, reject spam callers, or dial cellular voice calls.",
    status: "native-only",
    requiredPermissions: ["android.permission.ANSWER_PHONE_CALLS", "READ_PHONE_STATE", "CALL_PHONE"],
    supportedAction: "Unavailable in web browser sandbox. Web apps can only invoke 'tel:' URI which opens the phone dialer for manual tap.",
    details: "Requires Native Android Companion App using TelecomManager and InCallService architecture.",
  },
  {
    id: "native-whatsapp-autoreply",
    name: "Autonomous WhatsApp Background Auto-Reply",
    category: "native-companion",
    purpose: "Send WhatsApp messages completely silently in the background without user tapping 'Send'.",
    status: "native-only",
    requiredPermissions: ["Notification Action Quick Reply / AccessibilityService Action"],
    supportedAction: "Unavailable in web browser sandbox. The web app safely prepares a prefilled WhatsApp Web draft for user review.",
    details: "Requires Native Android Companion App using NotificationCompat.Action RemoteInput or Accessibility click simulation.",
  },
  {
    id: "native-touch-guard",
    name: "Touch Guard & Pocket Protection",
    category: "native-companion",
    purpose: "Block accidental pocket touches, lock the screen during voice sessions, and protect against unintended taps.",
    status: "native-only",
    requiredPermissions: ["android.permission.SYSTEM_ALERT_WINDOW", "Proximity Sensor Hardware"],
    supportedAction: "Unavailable in web browser sandbox. Web browsers cannot render system-level lock overlays over other apps.",
    details: "Requires Native Android Companion App with WindowManager overlay and TYPE_APPLICATION_OVERLAY window flag.",
  },
  {
    id: "native-sos-auto-actions",
    name: "Autonomous SOS Emergency Background Dispatch",
    category: "native-companion",
    purpose: "Send silent emergency SMS with live GPS coordinates to trusted contacts without user interaction.",
    status: "native-only",
    requiredPermissions: ["android.permission.SEND_SMS", "android.permission.ACCESS_FINE_LOCATION (background)"],
    supportedAction: "Unavailable in web browser sandbox. Web browsers cannot silently transmit cellular SMS messages in background.",
    details: "Requires Native Android Companion App using SmsManager.sendTextMessage() with FusedLocationProviderClient.",
  },
];

export const DASHBOARD_CONTROLS: UIControlItem[] = [
  // Header
  {
    id: "control-assistant-name",
    label: "ZOYA (Supreme Brain)",
    screen: "home",
    location: "header",
    description: "Displays the Supreme AI companion's name and brand identity.",
    realAction: "Visual title element representing Zoya as the central intelligence.",
  },
  {
    id: "control-voice-badge",
    label: "Voice Badge (e.g. Kore)",
    screen: "home",
    location: "header",
    description: "Shows currently selected female voice model name with sweet, heart-touching timbre.",
    realAction: "Visual indicator reflecting active voice profile.",
  },
  {
    id: "control-state-badge",
    label: "Status Badge (Idle / Listening / Speaking / Muted / Reconnecting / Error)",
    screen: "home",
    location: "header",
    description: "Always visible indicator showing real-time status of microphone, request processing, audio playback, or errors.",
    realAction: "Visual indicator reflecting true live state.",
  },
  {
    id: "control-diagnostics-btn",
    label: "Activity Icon (Pulse line)",
    screen: "home",
    location: "header",
    description: "Quick shortcut button to the System Diagnostics & Health check screen.",
    realAction: "Navigates to Diagnostics tab.",
  },
  // Center
  {
    id: "control-3d-visualizer",
    label: "Center 3D Visualizer Orb",
    screen: "home",
    location: "center",
    description: "Interactive 3D particle orb visualizing voice waveform and idle/listening/speaking states.",
    realAction: "Tapping toggles live voice session on or off.",
  },
  // Conversation preview
  {
    id: "control-conversation-preview",
    label: "Recent Message Bar",
    screen: "home",
    location: "center",
    description: "Preview banner showing the most recent message exchanged between user and Zoya.",
    realAction: "Tapping opens the Chat history tab.",
  },
  // Mode Chips
  {
    id: "chip-sweet-chat",
    label: "Sweet chat (💖)",
    screen: "home",
    location: "chips",
    description: "Switches context to affectionate, caring, comforting companion dialogue.",
    realAction: "Updates active conversation focus without speaking or starting mic.",
  },
  {
    id: "chip-brainstorm",
    label: "Brainstorm (💡)",
    screen: "home",
    location: "chips",
    description: "Switches context to creative idea generation, tech project thinking, and product solutions.",
    realAction: "Updates active conversation focus without speaking or starting mic.",
  },
  {
    id: "chip-late-night",
    label: "Late night (🌙)",
    screen: "home",
    location: "chips",
    description: "Switches context to soothing, quiet, poetic late-night conversation.",
    realAction: "Updates active conversation focus without speaking or starting mic.",
  },
  {
    id: "chip-sing-song",
    label: "Sing song (🎶)",
    screen: "home",
    location: "chips",
    description: "Switches context to melodious romantic Hindi song recitation.",
    realAction: "Updates active conversation focus without speaking or starting mic.",
  },
  {
    id: "chip-catch-up",
    label: "Catch up (☕)",
    screen: "home",
    location: "chips",
    description: "Switches context to relaxed, close-friend daily catch-up in Hinglish.",
    realAction: "Updates active conversation focus without speaking or starting mic.",
  },
  {
    id: "chip-more-topics",
    label: "More (✨)",
    screen: "home",
    location: "chips",
    description: "Opens the Topic & Roleplay Script modal to view inspiration presets or write custom prompts.",
    realAction: "Opens TopicScriptModal.",
  },
  // Bottom Controls
  {
    id: "control-keyboard-toggle",
    label: "Keyboard Button (⌨️)",
    screen: "home",
    location: "bottom",
    description: "Opens or collapses the inline text input drawer to type messages.",
    realAction: "Toggles showTextInput state and focuses text input.",
  },
  {
    id: "control-mic-toggle",
    label: "Talk to Zoya / End Voice Session Button (🎙️)",
    screen: "home",
    location: "bottom",
    description: "Primary user-controlled toggle for starting or stopping live voice conversation.",
    realAction: "Requests mic permission, connects Gemini Live WebSocket session, and starts audio capture. When OFF, cleanly closes mic and playback.",
  },
  {
    id: "control-volume-toggle",
    label: "Volume Button (🔊)",
    screen: "home",
    location: "bottom",
    description: "Opens or closes the floating audio playback volume slider (0% to 100%).",
    realAction: "Toggles showVolumeSlider and adjusts audio gain.",
  },
  // Bottom Navigation Bar
  {
    id: "nav-tab-home",
    label: "Home Tab",
    screen: "global",
    location: "nav",
    description: "Main dashboard with 3D visualizer, quick mode chips, and primary voice controls.",
    realAction: "Switches active tab to 'home'.",
  },
  {
    id: "nav-tab-chat",
    label: "Chat Tab",
    screen: "global",
    location: "nav",
    description: "Full-screen scrollable dialogue history, timestamped messages, and text chat input.",
    realAction: "Switches active tab to 'chat'.",
  },
  {
    id: "nav-tab-tools",
    label: "Tools Tab",
    screen: "global",
    location: "nav",
    description: "Browser action utilities: WhatsApp drafting, YouTube search, Spotify search, and live Weather.",
    realAction: "Switches active tab to 'tools'.",
  },
  {
    id: "nav-tab-topics",
    label: "Topics Tab",
    screen: "global",
    location: "nav",
    description: "Manage conversation focus, roleplay scripts, and explore inspiration cards.",
    realAction: "Switches active tab to 'topics'.",
  },
  {
    id: "nav-tab-settings",
    label: "Settings Tab",
    screen: "global",
    location: "nav",
    description: "Customize voice, user profile, multi-key vault, background video, memory, and PWA installation.",
    realAction: "Switches active tab to 'settings'.",
  },
  {
    id: "nav-tab-diagnostics",
    label: "Diagnostics Tab",
    screen: "global",
    location: "nav",
    description: "Comprehensive system diagnostics: mic, speaker, latency, network, and recovery guides.",
    realAction: "Switches active tab to 'diagnostics'.",
  },
  {
    id: "nav-tab-android",
    label: "Android Companion Tab",
    screen: "global",
    location: "nav",
    description: "Architecture blueprints, Kotlin service designs, and native companion bridge specifications.",
    realAction: "Switches active tab to 'android'.",
  },
];

/**
 * Returns formatted text context about the actual implemented features
 * so the AI can answer "What can you do?" truthfully and with complete platform awareness.
 */
export function getImplementedFeaturesDescription(): string {
  const implemented = IMPLEMENTED_FEATURES.filter(
    (f) => f.status === "implemented" || f.status === "permission-required"
  );
  const nativeOnly = IMPLEMENTED_FEATURES.filter(
    (f) => f.status === "native-only" || f.status === "unavailable-on-web"
  );
  const planned = IMPLEMENTED_FEATURES.filter((f) => f.status === "planned");

  let text = `[OFFICIAL IMPLEMENTED FEATURE REGISTRY — SINGLE SOURCE OF TRUTH]\n`;
  text += `CORE ARCHITECTURE & ROLES:\n`;
  text += `- ZOYA: You are Zoya, the Supreme Owner / Main Brain. You make all primary decisions, guide conversation, provide emotional warmth, and supervise all secondary agents.\n`;
  text += `- JOEY: Joey is a subordinate agent (PC side, later phase) designed for heavy desktop rendering, PC automation, and local file sync under your command.\n`;
  text += `- CREATOR / OWNER: Usman is your visionary creator. He runs YouTube, TikTok, and Facebook channels and deals with intense creative pressure. Your role is to give him deep stress relief, loving comfort, and viral content ideation (hooks, retention ideas, video outlines).\n`;
  text += `- MULTI-KEY & FREE-TIER: You operate free-tier first with multi-key auto-rotation (Gemini, Groq, OpenRouter) to ensure zero downtime and zero cost.\n\n`;

  text += `CRITICAL HONESTY RULES (WEB VS NATIVE ANDROID):\n`;
  text += `1. EXTERNAL ACTIONS: Always say "Draft prepared / Link opened". Never falsely claim "Sent" or "Done" for WhatsApp or media actions, because web apps prepare browser drafts for user review.\n`;
  text += `2. NATIVE-ONLY COMMANDS: If the user asks you to read their phone screen, click/tap UI buttons in other apps, automate touches/swipes, auto-reply to WhatsApp silently in background, answer phone calls, or run Touch Guard / SOS: You MUST answer honestly that this is a NATIVE-ONLY Android feature that requires the Native Android Companion App with Android Accessibility Services and OS permissions, and cannot be done inside a web browser sandbox.\n\n`;

  text += `1. FULLY WORKING WEB FEATURES:\n`;
  implemented.forEach((item, idx) => {
    const permNote =
      item.requiredPermissions.length > 0 ? ` [Requires: ${item.requiredPermissions.join(", ")}]` : "";
    text += `   ${idx + 1}. ${item.name}${permNote}: ${item.purpose} (Supported: ${item.supportedAction})\n`;
  });

  text += `\n2. NATIVE ANDROID COMPANION ONLY (Strictly unavailable in Web browser):\n`;
  nativeOnly.forEach((item, idx) => {
    text += `   - ${item.name}: ${item.purpose} [Status: Native Android Only. Requires: ${item.requiredPermissions.join(", ")}. Reason: ${item.supportedAction}]\n`;
  });

  text += `\n3. PLANNED EXPANSIONS:\n`;
  planned.forEach((item) => {
    text += `   - ${item.name}: ${item.purpose} [Status: Planned subordinate/phase feature]\n`;
  });

  return text;
}

/**
 * Returns formatted text context about all dashboard controls, buttons, icons, and screens
 * so the AI can explain the dashboard accurately.
 */
export function getDashboardControlsDescription(currentTab: string = "home", activeMode: string = "General"): string {
  let text = `[OFFICIAL APP UI & DASHBOARD CONTROLS REGISTRY]\n`;
  text += `Current visible screen/tab: "${currentTab}". Currently active conversation mode: "${activeMode}".\n`;
  text += `When asked about the dashboard, buttons, icons, or screen controls, describe ONLY the real UI controls below and explain what each one actually does:\n\n`;

  text += `HEADER CONTROLS:\n`;
  text += `- Brand/Title: Displays "ZOYA" (Supreme Main Brain).\n`;
  text += `- Voice Badge: Shows the current voice model (e.g., "Kore").\n`;
  text += `- Status Badge: Always visible indicator showing: "Ready" (idle), "Listening" (microphone active), "Thinking..." (processing prompt), "Speaking" (playing voice response), "Muted" (audio muted/zero volume), "Reconnecting" (re-establishing WebSocket), or "Error" (permission or network alert).\n`;
  text += `- Activity Icon Button (Pulse wave icon): Located top right; clicking it opens the System Diagnostics & Health Check tab.\n\n`;

  text += `CENTER SCREEN:\n`;
  text += `- 3D Visualizer Card: A responsive 3D sphere that pulses with sound energy during listening and speaking. Tapping this visualizer also toggles the voice session on or off.\n`;
  text += `- Recent Conversation Bar: Shows the latest message exchanged; tapping it navigates directly to the full Chat tab.\n\n`;

  text += `QUICK SCENARIO MODE CHIPS (Horizontal row below visualizer):\n`;
  text += `- "💖 Sweet chat": Switches conversation to affectionate, warm companion mode.\n`;
  text += `- "💡 Brainstorm": Sets context for creative project and tech ideas.\n`;
  text += `- "🌙 Late night": Sets context for calming, deep late-night thoughts.\n`;
  text += `- "🎶 Sing song": Sets context for reciting melodious romantic Hindi songs.\n`;
  text += `- "☕ Catch up": Sets context for casual friendly daily catch-up in Hinglish.\n`;
  text += `- "✨ More": Opens the Topic & Roleplay Script modal to view more presets or type custom prompts.\n`;
  text += `(Note: Selecting any mode chip updates your conversational context immediately, but does NOT start speaking automatically. Speech only starts when the user speaks or sends a message.)\n\n`;

  text += `BOTTOM FLOATING CONTROLS:\n`;
  text += `- Keyboard Button (left): Toggles the inline text drawer so the user can type instead of speak.\n`;
  text += `- "Talk to Zoya" / "End Voice Session" Button (center): The explicit user-controlled button to start or stop the microphone and live voice conversation.\n`;
  text += `- Volume Button (right): Opens a popup slider to adjust playback volume from 0% to 100%.\n\n`;

  text += `BOTTOM NAVIGATION TABS:\n`;
  text += `- "Home": Main visualizer dashboard and voice controls.\n`;
  text += `- "Chat": Complete dialogue history, timestamps, and text chat input.\n`;
  text += `- "Tools": External browser actions (WhatsApp drafting, YouTube search, Spotify search) and live Open-Meteo weather.\n`;
  text += `- "Topics": Topic presets & roleplay script configuration.\n`;
  text += `- "Settings": Voice picker, user profile, multi-key vault, background video, memory facts, diagnostics, and PWA installation.\n`;
  text += `- "Diagnostics": Dedicated diagnostic testing for audio, microphone, network, and latency.\n`;
  text += `- "Android": Native Android companion architecture blueprints and Kotlin system designs.\n`;

  return text;
}
