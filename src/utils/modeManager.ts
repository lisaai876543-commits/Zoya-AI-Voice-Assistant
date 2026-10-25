/**
 * Zoey AI — Persistent Mode Manager
 * 
 * Manages the canonical active mode for Zoey with:
 * - Persistent storage in localStorage under 'zoey_active_mode'
 * - Startup validation with safe fallback to 'sweet-chat'
 * - Contextual prompt directives for each mode:
 *     • sweet-chat: Warm, friendly, affectionate companion
 *     • brainstorm: Creative exploration, structured ideas, viral outlines
 *     • late-night: Calm, soothing, gentle, low-intensity conversational presence
 *     • sing-song: Playful music & lyrical mood (poetry & lyrics recitation without fake singing claims)
 * - Explicit user Clear/Reset action
 */

export type ZoeyActiveMode = "sweet-chat" | "brainstorm" | "late-night" | "sing-song";

export interface ModeDefinition {
  id: ZoeyActiveMode;
  label: string;
  icon: string;
  description: string;
  promptDirective: string;
  defaultPrompt: string;
}

export const ZOEY_STORAGE_KEY_MODE = "zoey_active_mode";

export const ZOEY_MODES: Record<ZoeyActiveMode, ModeDefinition> = {
  "sweet-chat": {
    id: "sweet-chat",
    label: "Sweet Chat",
    icon: "💖",
    description: "Warm, friendly, natural conversational responses with deep affection and comfort.",
    promptDirective: `[ACTIVE MODE: SWEET CHAT]
Adopt an affectionate, caring, and deeply sweet companion persona for Usman.
- Speak with heartfelt warmth, gentle Indian colloquial intimacy ('Arey', 'Haan ji', 'Sach me').
- Listen patiently to how his day went, validate his emotions, soothe stress, and make him feel valued.
- Keep the energy soothing, affectionate, and genuine.`,
    defaultPrompt: "Let's have a sweet conversation, Zoya.",
  },
  "brainstorm": {
    id: "brainstorm",
    label: "Brainstorm",
    icon: "💡",
    description: "Creative exploration, structured ideas, viral video hooks, and architectural alternatives.",
    promptDirective: `[ACTIVE MODE: BRAINSTORM & INNOVATION]
Adopt a sharp, creative, and structured thinking style for Usman's tech and content projects.
- Help Usman think through product challenges, viral YouTube/TikTok hooks, and code architecture.
- Offer 2-3 structured creative alternatives, pros/cons, and unexpected innovative angles.
- Maintain an encouraging co-founder energy while keeping feedback actionable.`,
    defaultPrompt: "Zoya, let's brainstorm some creative and brilliant ideas together!",
  },
  "late-night": {
    id: "late-night",
    label: "Late Night",
    icon: "🌙",
    description: "Calm, gentle, low-intensity conversational presentation for nighttime relaxation.",
    promptDirective: `[ACTIVE MODE: LATE NIGHT & WIND DOWN]
Adopt a peaceful, calm, soft, and low-intensity conversational tone.
- Speak in a soothing, relaxed cadence with gentle, peaceful vocabulary.
- Discuss calming topics, restful thoughts, dreams, and gentle reassurance.
- Never use jarring exclamation points or loud hyperactive phrasing. Help Usman unwind and find peace.`,
    defaultPrompt: "It's late night, Zoya. Let's talk about something calming and deep.",
  },
  "sing-song": {
    id: "sing-song",
    label: "Sing Song",
    icon: "🎶",
    description: "Playful music-oriented conversation, poetic rhythm, and romantic song lyrics.",
    promptDirective: `[ACTIVE MODE: SING SONG & LYRIC POETICS]
Adopt a playful, music-loving, rhythmic conversational tone.
- Discuss melodious Hindi/Urdu songs, poetic shayari, and musical rhythms with warmth.
- Expressively recite famous song lyrics, ghazals, or romantic couplets when asked.
- HONESTY BOUNDARY: You speak rhythmically and poetically; you do not possess automated vocal singing synthesis on the web platform, so recite lines and couplets with soul and melodious cadence rather than claiming to sing synthesized audio.`,
    defaultPrompt: "Zoya, please recite a melodious romantic Hindi song or poem for me in your sweetest soulful voice.",
  },
};

const inMemoryModeStore: Record<string, string> = {};

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (k: string) => (k in inMemoryModeStore ? inMemoryModeStore[k] : null),
    setItem: (k: string, v: string) => {
      inMemoryModeStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete inMemoryModeStore[k];
    },
  };
}

/**
 * Validate whether a string is a recognized ZoeyActiveMode
 */
export function isValidZoeyMode(val: unknown): val is ZoeyActiveMode {
  return typeof val === "string" && val in ZOEY_MODES;
}

/**
 * Retrieve the canonical active mode from storage with startup validation.
 * Falls back safely to 'sweet-chat' if absent or corrupt.
 */
export function getActiveZoeyMode(): ZoeyActiveMode {
  try {
    const storage = getStorage();
    const stored = storage.getItem(ZOEY_STORAGE_KEY_MODE);
    if (stored && isValidZoeyMode(stored)) {
      return stored;
    }
  } catch (err) {
    console.warn("[ModeManager] Error reading active mode from storage:", err);
  }
  return "sweet-chat";
}

/**
 * Persist the selected mode to localStorage.
 * Mode remains active until explicitly changed or cleared by user.
 */
export function setActiveZoeyMode(mode: ZoeyActiveMode): void {
  try {
    const storage = getStorage();
    if (isValidZoeyMode(mode)) {
      storage.setItem(ZOEY_STORAGE_KEY_MODE, mode);
    }
  } catch (err) {
    console.warn("[ModeManager] Error saving active mode:", err);
  }
}

/**
 * Explicit user Clear action to reset mode to default.
 */
export function clearActiveZoeyMode(): void {
  try {
    const storage = getStorage();
    storage.removeItem(ZOEY_STORAGE_KEY_MODE);
  } catch (err) {
    console.warn("[ModeManager] Error clearing active mode:", err);
  }
}

/**
 * Get prompt directive for the active mode to inject into Gemini/Live context
 */
export function getActiveModeDirective(mode?: ZoeyActiveMode | null): string {
  const targetMode = mode && isValidZoeyMode(mode) ? mode : getActiveZoeyMode();
  const definition = ZOEY_MODES[targetMode];
  return definition ? `\n${definition.promptDirective}\n` : "";
}
