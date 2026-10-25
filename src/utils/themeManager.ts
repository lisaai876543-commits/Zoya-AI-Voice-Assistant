/**
 * ZOYA AI — Premium Theme Engine
 * 
 * Locks exactly the 10 authentic visual themes extracted from the reference design system:
 * 1. Quantum Cyan: Primary #00F0FF, Secondary #0077FF, Glow #00FFFF, Background #050510
 * 2. Crimson Blaze: Primary #FF2A4D, Secondary #FF6B00, Glow #FF3C00, Background #120508
 * 3. Amethyst Void: Primary #BF5AFF, Secondary #7B2FFF, Glow #D580FF, Background #0A0515
 * 4. Emerald Pulse: Primary #00FF9D, Secondary #00C853, Glow #70FFB8, Background #03120A
 * 5. Arctic Silver: Primary #E8F4FF, Secondary #A0C4FF, Glow #FFFFFF, Background #0B0F14
 * 6. Solar Gold: Primary #FFB300, Secondary #FF6D00, Glow #FFD54F, Background #1A0F00
 * 7. Deep Ocean: Primary #00B4FF, Secondary #0055FF, Glow #4FC3F7, Background #020B1A
 * 8. Rose Nebula: Primary #FF6BCB, Secondary #FF3D8E, Glow #FF9DE0, Background #1A0512
 * 9. Neon Aurora: Primary gradient #00F5A0 to #00D4FF, Glow #70FFD8, Background #031018
 * 10. Midnight Violet: Primary #9D4EDD, Secondary #5A189A, Glow #C77DFF, Background #0D0221
 */

export type ThemeId =
  | "quantum-cyan"
  | "crimson-blaze"
  | "amethyst-void"
  | "emerald-pulse"
  | "arctic-silver"
  | "solar-gold"
  | "deep-ocean"
  | "rose-nebula"
  | "neon-aurora"
  | "midnight-violet";

export interface ZoyaTheme {
  id: ThemeId;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  bg: string;
  isGradientPrimary?: boolean;
  primaryGradient?: string;
  rgb: {
    primary: string;
    secondary: string;
    glow: string;
  };
  glassBg: string;
  borderColor: string;
  buttonGradient: string;
}

export const ZOYA_THEMES: Record<ThemeId, ZoyaTheme> = {
  "quantum-cyan": {
    id: "quantum-cyan",
    name: "Quantum Cyan",
    primary: "#00F0FF",
    secondary: "#0077FF",
    glow: "#00FFFF",
    bg: "#050510",
    rgb: {
      primary: "0, 240, 255",
      secondary: "0, 119, 255",
      glow: "0, 255, 255",
    },
    glassBg: "rgba(0, 240, 255, 0.08)",
    borderColor: "rgba(0, 240, 255, 0.3)",
    buttonGradient: "linear-gradient(135deg, #00F0FF 0%, #0077FF 100%)",
  },
  "crimson-blaze": {
    id: "crimson-blaze",
    name: "Crimson Blaze",
    primary: "#FF2A4D",
    secondary: "#FF6B00",
    glow: "#FF3C00",
    bg: "#120508",
    rgb: {
      primary: "255, 42, 77",
      secondary: "255, 107, 0",
      glow: "255, 60, 0",
    },
    glassBg: "rgba(255, 42, 77, 0.08)",
    borderColor: "rgba(255, 42, 77, 0.35)",
    buttonGradient: "linear-gradient(135deg, #FF2A4D 0%, #FF6B00 100%)",
  },
  "amethyst-void": {
    id: "amethyst-void",
    name: "Amethyst Void",
    primary: "#BF5AFF",
    secondary: "#7B2FFF",
    glow: "#D580FF",
    bg: "#0A0515",
    rgb: {
      primary: "191, 90, 255",
      secondary: "123, 47, 255",
      glow: "213, 128, 255",
    },
    glassBg: "rgba(191, 90, 255, 0.08)",
    borderColor: "rgba(191, 90, 255, 0.35)",
    buttonGradient: "linear-gradient(135deg, #BF5AFF 0%, #7B2FFF 100%)",
  },
  "emerald-pulse": {
    id: "emerald-pulse",
    name: "Emerald Pulse",
    primary: "#00FF9D",
    secondary: "#00C853",
    glow: "#70FFB8",
    bg: "#03120A",
    rgb: {
      primary: "0, 255, 157",
      secondary: "0, 200, 83",
      glow: "112, 255, 184",
    },
    glassBg: "rgba(0, 255, 157, 0.08)",
    borderColor: "rgba(0, 255, 157, 0.3)",
    buttonGradient: "linear-gradient(135deg, #00FF9D 0%, #00C853 100%)",
  },
  "arctic-silver": {
    id: "arctic-silver",
    name: "Arctic Silver",
    primary: "#E8F4FF",
    secondary: "#A0C4FF",
    glow: "#FFFFFF",
    bg: "#0B0F14",
    rgb: {
      primary: "232, 244, 255",
      secondary: "160, 196, 255",
      glow: "255, 255, 255",
    },
    glassBg: "rgba(232, 244, 255, 0.09)",
    borderColor: "rgba(232, 244, 255, 0.3)",
    buttonGradient: "linear-gradient(135deg, #FFFFFF 0%, #A0C4FF 100%)",
  },
  "solar-gold": {
    id: "solar-gold",
    name: "Solar Gold",
    primary: "#FFB300",
    secondary: "#FF6D00",
    glow: "#FFD54F",
    bg: "#1A0F00",
    rgb: {
      primary: "255, 179, 0",
      secondary: "255, 109, 0",
      glow: "255, 213, 79",
    },
    glassBg: "rgba(255, 179, 0, 0.08)",
    borderColor: "rgba(255, 179, 0, 0.35)",
    buttonGradient: "linear-gradient(135deg, #FFB300 0%, #FF6D00 100%)",
  },
  "deep-ocean": {
    id: "deep-ocean",
    name: "Deep Ocean",
    primary: "#00B4FF",
    secondary: "#0055FF",
    glow: "#4FC3F7",
    bg: "#020B1A",
    rgb: {
      primary: "0, 180, 255",
      secondary: "0, 85, 255",
      glow: "79, 195, 247",
    },
    glassBg: "rgba(0, 180, 255, 0.08)",
    borderColor: "rgba(0, 180, 255, 0.32)",
    buttonGradient: "linear-gradient(135deg, #00B4FF 0%, #0055FF 100%)",
  },
  "rose-nebula": {
    id: "rose-nebula",
    name: "Rose Nebula",
    primary: "#FF6BCB",
    secondary: "#FF3D8E",
    glow: "#FF9DE0",
    bg: "#1A0512",
    rgb: {
      primary: "255, 107, 203",
      secondary: "255, 61, 142",
      glow: "255, 157, 224",
    },
    glassBg: "rgba(255, 107, 203, 0.09)",
    borderColor: "rgba(255, 107, 203, 0.35)",
    buttonGradient: "linear-gradient(135deg, #FF6BCB 0%, #FF3D8E 100%)",
  },
  "neon-aurora": {
    id: "neon-aurora",
    name: "Neon Aurora",
    primary: "#00F5A0",
    secondary: "#00D4FF",
    glow: "#70FFD8",
    bg: "#031018",
    isGradientPrimary: true,
    primaryGradient: "linear-gradient(135deg, #00F5A0 0%, #00D4FF 100%)",
    rgb: {
      primary: "0, 245, 160",
      secondary: "0, 212, 255",
      glow: "112, 255, 216",
    },
    glassBg: "rgba(0, 245, 160, 0.08)",
    borderColor: "rgba(0, 245, 160, 0.3)",
    buttonGradient: "linear-gradient(135deg, #00F5A0 0%, #00D4FF 100%)",
  },
  "midnight-violet": {
    id: "midnight-violet",
    name: "Midnight Violet",
    primary: "#9D4EDD",
    secondary: "#5A189A",
    glow: "#C77DFF",
    bg: "#0D0221",
    rgb: {
      primary: "157, 78, 221",
      secondary: "90, 24, 154",
      glow: "199, 125, 255",
    },
    glassBg: "rgba(157, 78, 221, 0.09)",
    borderColor: "rgba(157, 78, 221, 0.35)",
    buttonGradient: "linear-gradient(135deg, #9D4EDD 0%, #5A189A 100%)",
  },
};

export const THEME_ORDER: ThemeId[] = [
  "quantum-cyan",
  "crimson-blaze",
  "amethyst-void",
  "emerald-pulse",
  "arctic-silver",
  "solar-gold",
  "deep-ocean",
  "rose-nebula",
  "neon-aurora",
  "midnight-violet",
];

export const ZOEY_THEMES = ZOYA_THEMES;
export const ZOEY_STORAGE_KEY_THEME = "zoya_active_theme";

const inMemoryThemeStore: Record<string, string> = {};

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (k: string) => (k in inMemoryThemeStore ? inMemoryThemeStore[k] : null),
    setItem: (k: string, v: string) => {
      inMemoryThemeStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete inMemoryThemeStore[k];
    },
  };
}

export function isValidThemeId(val: unknown): val is ThemeId {
  return typeof val === "string" && val in ZOEY_THEMES;
}

export function getActiveThemeId(): ThemeId {
  try {
    const storage = getStorage();
    const stored = storage.getItem(ZOEY_STORAGE_KEY_THEME);
    if (stored && isValidThemeId(stored)) {
      return stored;
    }
  } catch (err) {
    console.warn("[ThemeManager] Error reading active theme:", err);
  }
  return "quantum-cyan";
}

export function getActiveTheme(): ZoyaTheme {
  const id = getActiveThemeId();
  return ZOEY_THEMES[id] || ZOEY_THEMES["quantum-cyan"];
}

const themeSubscribers = new Set<(theme: ZoyaTheme) => void>();

export function applyThemeToDocument(theme: ZoyaTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", theme.primary);
  root.style.setProperty("--theme-secondary", theme.secondary);
  root.style.setProperty("--theme-glow", theme.glow);
  root.style.setProperty("--theme-bg", theme.bg);
  root.style.setProperty("--theme-primary-rgb", theme.rgb.primary);
  root.style.setProperty("--theme-secondary-rgb", theme.rgb.secondary);
  root.style.setProperty("--theme-glow-rgb", theme.rgb.glow);
  root.style.setProperty("--theme-glass-bg", theme.glassBg);
  root.style.setProperty("--theme-border-color", theme.borderColor);
  root.style.setProperty("--theme-button-gradient", theme.buttonGradient);

  // Set document background smoothly
  document.body.style.backgroundColor = theme.bg;
}

export function setActiveTheme(themeId: ThemeId): ZoyaTheme {
  const safeId: ThemeId = isValidThemeId(themeId) ? themeId : "quantum-cyan";
  const theme = ZOEY_THEMES[safeId];
  try {
    const storage = getStorage();
    storage.setItem(ZOEY_STORAGE_KEY_THEME, safeId);
  } catch (err) {
    console.warn("[ThemeManager] Error saving theme:", err);
  }

  applyThemeToDocument(theme);

  themeSubscribers.forEach((cb) => {
    try {
      cb(theme);
    } catch {}
  });

  return theme;
}

export function getNextTheme(): ZoyaTheme {
  const currentId = getActiveThemeId();
  const currentIndex = THEME_ORDER.indexOf(currentId);
  const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
  const nextThemeId = THEME_ORDER[nextIndex];
  return setActiveTheme(nextThemeId);
}

export function subscribeThemeChange(callback: (theme: ZoyaTheme) => void): () => void {
  themeSubscribers.add(callback);
  return () => {
    themeSubscribers.delete(callback);
  };
}

/**
 * Parses natural voice commands for theme switching
 * Examples:
 * - "Zoya, change theme"
 * - "Zoya, next theme"
 * - "Zoya, change theme to Crimson Blaze"
 * - "switch theme to solar gold"
 */
export function matchThemeFromVoice(command: string): { matches: boolean; theme?: ZoyaTheme; isNext?: boolean } {
  const clean = command.toLowerCase().replace(/[,.!?]/g, " ").replace(/\s+/g, " ").trim();

  // Next / generic change commands
  if (
    clean === "zoya change theme" ||
    clean === "change theme" ||
    clean === "next theme" ||
    clean === "zoya next theme" ||
    clean === "switch theme" ||
    clean === "zoya switch theme" ||
    clean.includes("theme change") ||
    clean.includes("next theme")
  ) {
    return { matches: true, isNext: true };
  }

  // Exact or fuzzy target theme name search
  for (const id of THEME_ORDER) {
    const theme = ZOEY_THEMES[id];
    const nameLower = theme.name.toLowerCase();
    const parts = nameLower.split(" ");
    
    // Check full name e.g. "crimson blaze"
    if (clean.includes(nameLower)) {
      return { matches: true, theme };
    }
    // Check primary word if distinctive
    if (parts[0] && parts[0].length >= 4 && clean.includes(parts[0])) {
      return { matches: true, theme };
    }
  }

  return { matches: false };
}
