export type AppTheme = "midnight" | "rosegold" | "cyberpunk" | "amethyst";
export type FontSize = "compact" | "normal" | "large";
export type CornerStyle = "rounded-xl" | "rounded-2xl" | "rounded-3xl";
export type LanguagePreference = "hinglish" | "hindi" | "english" | "urdu";
export type PersonaPreset = "companion" | "tech" | "poet" | "philosopher";
export type ConversationMode = "expressive" | "fast";

export interface AppConfig {
  apiKey: string;
  userName: string;
  assistantName: string;
  systemPrompt: string;
  voiceName?: string;
  activeTopicOrScript?: string;
  theme?: AppTheme;
  fontSize?: FontSize;
  cornerStyle?: CornerStyle;
  language?: LanguagePreference;
  personaPreset?: PersonaPreset;
  conversationMode?: ConversationMode;
  useLongTermMemory?: boolean;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  enableBrowserActions?: boolean;
  enableDraftConfirmations?: boolean;
  activeMode?: "sweet-chat" | "brainstorm" | "late-night" | "sing-song";
  bgOpacity?: number; // 0 to 100
  speechRate?: number; // 0.8 to 1.3
}

export type AppState = "ready" | "idle" | "listening" | "processing" | "speaking" | "muted" | "interrupted" | "reconnecting" | "error";

export type NavTab = "home" | "chat" | "tools" | "topics" | "studio" | "history" | "settings" | "diagnostics" | "android";

export interface WeatherData {
  city: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  weatherCode: number;
  time: string;
}

export interface MemoryFact {
  id: string;
  category: "identity" | "preference" | "project" | "fact" | "instruction";
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}
