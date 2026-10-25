import {
  ZOEY_THEMES,
  THEME_ORDER,
  getActiveTheme,
  setActiveTheme,
  getNextTheme,
  matchThemeFromVoice,
  ZOEY_STORAGE_KEY_THEME,
  ThemeId,
} from "../src/utils/themeManager";
import { processCommand } from "../src/services/commandService";

let failures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

async function runThemeSuite() {
  console.log("\n=======================================================");
  console.log("🎨 TESTING ZOYA 10 LOCKED THEMES & INFINITY HOLOGRAM");
  console.log("=======================================================\n");

  // 1. Verify exact 10 themes extracted and locked
  console.log("--- 1. EXACT 10 LOCKED THEMES VALIDATION ---");
  assert(THEME_ORDER.length === 10, `Exactly 10 themes locked (found ${THEME_ORDER.length})`);

  const expectedThemes: Record<ThemeId, { primary: string; secondary: string; glow: string; bg: string }> = {
    "quantum-cyan": { primary: "#00F0FF", secondary: "#0077FF", glow: "#00FFFF", bg: "#050510" },
    "crimson-blaze": { primary: "#FF2A4D", secondary: "#FF6B00", glow: "#FF3C00", bg: "#120508" },
    "amethyst-void": { primary: "#BF5AFF", secondary: "#7B2FFF", glow: "#D580FF", bg: "#0A0515" },
    "emerald-pulse": { primary: "#00FF9D", secondary: "#00C853", glow: "#70FFB8", bg: "#03120A" },
    "arctic-silver": { primary: "#E8F4FF", secondary: "#A0C4FF", glow: "#FFFFFF", bg: "#0B0F14" },
    "solar-gold": { primary: "#FFB300", secondary: "#FF6D00", glow: "#FFD54F", bg: "#1A0F00" },
    "deep-ocean": { primary: "#00B4FF", secondary: "#0055FF", glow: "#4FC3F7", bg: "#020B1A" },
    "rose-nebula": { primary: "#FF6BCB", secondary: "#FF3D8E", glow: "#FF9DE0", bg: "#1A0512" },
    "neon-aurora": { primary: "#00F5A0", secondary: "#00D4FF", glow: "#70FFD8", bg: "#031018" },
    "midnight-violet": { primary: "#9D4EDD", secondary: "#5A189A", glow: "#C77DFF", bg: "#0D0221" },
  };

  for (const id of THEME_ORDER) {
    const theme = ZOEY_THEMES[id];
    const expected = expectedThemes[id];
    assert(theme !== undefined, `Theme '${id}' exists`);
    assert(theme.primary.toUpperCase() === expected.primary.toUpperCase(), `${id} Primary matches ${expected.primary}`);
    assert(theme.secondary.toUpperCase() === expected.secondary.toUpperCase(), `${id} Secondary matches ${expected.secondary}`);
    assert(theme.glow.toUpperCase() === expected.glow.toUpperCase(), `${id} Glow matches ${expected.glow}`);
    assert(theme.bg.toUpperCase() === expected.bg.toUpperCase(), `${id} Background matches ${expected.bg}`);
  }

  // 2. Theme Switching & Cycling
  console.log("\n--- 2. THEME SWITCHING & CYCLING ---");
  setActiveTheme("quantum-cyan");
  assert(getActiveTheme().id === "quantum-cyan", "Initial theme set to Quantum Cyan");

  const next1 = getNextTheme();
  assert(next1.id === "crimson-blaze", `getNextTheme() transitioned to Crimson Blaze (got ${next1.name})`);

  setActiveTheme("midnight-violet");
  const nextLoop = getNextTheme();
  assert(nextLoop.id === "quantum-cyan", "getNextTheme() wraps around smoothly to Quantum Cyan");

  // 3. Voice Command Recognition
  console.log("\n--- 3. VOICE THEME MATCHING ---");
  const v1 = matchThemeFromVoice("zoya, change theme");
  assert(v1.matches === true && v1.isNext === true, "'Zoya, change theme' triggers next theme cycle");

  const v2 = matchThemeFromVoice("zoya next theme");
  assert(v2.matches === true && v2.isNext === true, "'Zoya next theme' triggers next theme cycle");

  const v3 = matchThemeFromVoice("zoya, change theme to crimson blaze");
  assert(v3.matches === true && v3.theme?.id === "crimson-blaze", "'Zoya, change theme to Crimson Blaze' matches Crimson Blaze");

  const v4 = matchThemeFromVoice("switch theme to solar gold");
  assert(v4.matches === true && v4.theme?.id === "solar-gold", "'switch theme to solar gold' matches Solar Gold");

  const v5 = matchThemeFromVoice("zoya change theme to neon aurora");
  assert(v5.matches === true && v5.theme?.id === "neon-aurora", "'change theme to neon aurora' matches Neon Aurora");

  // 4. Command Service Integration
  console.log("\n--- 4. COMMAND SERVICE INTEGRATION ---");
  const cmdResult = processCommand("Zoya, change theme to Amethyst Void", "Usman");
  assert(cmdResult.isBrowserAction === false, "Theme command is local, not browser action");
  assert(cmdResult.action.includes("Amethyst Void"), `Command action confirms Amethyst Void (got: "${cmdResult.action}")`);
  assert(getActiveTheme().id === "amethyst-void", "Active theme is now Amethyst Void");

  const nextCmdResult = processCommand("Zoya, next theme", "Usman");
  assert(getActiveTheme().id === "emerald-pulse", "Voice 'next theme' switched to Emerald Pulse");

  console.log("\n=======================================================");
  if (failures === 0) {
    console.log("🎉 ALL 10 THEMES & THEME ENGINE TESTS PASSED!");
  } else {
    console.error(`💥 ${failures} TEST(S) FAILED!`);
    process.exit(1);
  }
  console.log("=======================================================\n");
}

runThemeSuite();
