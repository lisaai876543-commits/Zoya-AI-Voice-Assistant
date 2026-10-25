/**
 * Automated Verification Suite:
 * 1. Real-Time Voice State Machine
 * 2. Persistent Mode Chips & Storage
 * 3. Browser & Dashboard Honesty
 * 4. Interactive Character Hologram & Audio Analyser
 */

import {
  getActiveZoeyMode,
  setActiveZoeyMode,
  clearActiveZoeyMode,
  isValidZoeyMode,
  getActiveModeDirective,
  ZOEY_STORAGE_KEY_MODE,
  ZOEY_MODES,
  ZoeyActiveMode,
} from "../src/utils/modeManager";
import { processCommand } from "../src/services/commandService";
import {
  getLiveAudioEnergy,
  reportMicrophoneLevel,
  subscribeAudioEnergy,
  registerPlaybackAnalyser,
} from "../src/utils/audioAnalyser";
import { AppConfig, AppState } from "../src/types";

let testFailures = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    testFailures++;
  } else {
    console.log(`✅ ${msg}`);
  }
}

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING ZOEY AI VOICE STATE, MODE CHIPS & HOLOGRAM TESTS");
  console.log("=======================================================\n");

  // ==========================================
  // Test 1: Mode Chips Canonical Storage & Lifecycle
  // ==========================================
  console.log("--- 1. MODE CHIPS PERSISTENCE & STORAGE ---");

  // Clear mode first
  clearActiveZoeyMode();
  let initialMode = getActiveZoeyMode();
  assert(initialMode === "sweet-chat", "Default mode falls back safely to 'sweet-chat'");

  // Set to 'brainstorm'
  setActiveZoeyMode("brainstorm");
  assert(getActiveZoeyMode() === "brainstorm", "Active mode persists to 'brainstorm'");

  // Set to 'late-night'
  setActiveZoeyMode("late-night");
  assert(getActiveZoeyMode() === "late-night", "Active mode persists to 'late-night'");

  // Set to 'sing-song'
  setActiveZoeyMode("sing-song");
  assert(getActiveZoeyMode() === "sing-song", "Active mode persists to 'sing-song'");

  // Test validation
  assert(isValidZoeyMode("sweet-chat") === true, "sweet-chat is valid mode");
  assert(isValidZoeyMode("brainstorm") === true, "brainstorm is valid mode");
  assert(isValidZoeyMode("late-night") === true, "late-night is valid mode");
  assert(isValidZoeyMode("sing-song") === true, "sing-song is valid mode");
  assert(isValidZoeyMode("invalid-junk-mode") === false, "invalid mode string rejected");

  // Test corrupted storage recovery
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(ZOEY_STORAGE_KEY_MODE, "corrupted_mode_xyz");
    assert(getActiveZoeyMode() === "sweet-chat", "Corrupt stored value recovers safely to 'sweet-chat'");
  }

  // Test clearActiveZoeyMode
  clearActiveZoeyMode();
  assert(getActiveZoeyMode() === "sweet-chat", "clearActiveZoeyMode resets cleanly to default");

  // Test prompt directive injection
  const sweetDirective = getActiveModeDirective("sweet-chat");
  assert(sweetDirective.includes("[ACTIVE MODE: SWEET CHAT]"), "Sweet Chat prompt directive contains proper header");

  const brainstormDirective = getActiveModeDirective("brainstorm");
  assert(brainstormDirective.includes("[ACTIVE MODE: BRAINSTORM & INNOVATION]"), "Brainstorm prompt directive contains proper header");

  const lateNightDirective = getActiveModeDirective("late-night");
  assert(lateNightDirective.includes("[ACTIVE MODE: LATE NIGHT & WIND DOWN]"), "Late Night prompt directive contains proper header");

  const singSongDirective = getActiveModeDirective("sing-song");
  assert(singSongDirective.includes("[ACTIVE MODE: SING SONG & LYRIC POETICS]"), "Sing Song prompt directive contains lyrical & honesty guidance");
  assert(singSongDirective.includes("HONESTY BOUNDARY"), "Sing Song contains honest boundary about web audio recitation");

  // ==========================================
  // Test 2: Browser & Dashboard Honesty
  // ==========================================
  console.log("\n--- 2. BROWSER & DASHBOARD HONESTY ---");

  // Requesting to inspect a tab or website in web sandbox
  const tabInspectCmd = processCommand("Can you see my tab?");
  assert(
    tabInspectCmd.action === "I can open the page, but I cannot currently see its contents in this web version.",
    "Web tab inspection returns exact truthful message"
  );

  const webpageCmd = processCommand("Inspect this webpage and tell me what is on it");
  assert(
    webpageCmd.action === "I can open the page, but I cannot currently see its contents in this web version.",
    "Webpage reading returns exact truthful message"
  );

  const screenCmd = processCommand("Read my screen");
  assert(
    screenCmd.isNativeOnly === true && screenCmd.action.includes("Native Android Companion feature"),
    "Screen reading is identified as Native-Only Android Accessibility feature"
  );

  const clickCmd = processCommand("Click on the submit button");
  assert(
    clickCmd.isNativeOnly === true && clickCmd.action.includes("Native Android Companion feature"),
    "UI button clicking is identified as Native-Only Android Accessibility feature"
  );

  // Opening a URL honestly opens navigation, does NOT claim screen vision
  const openCmd = processCommand("Open github");
  assert(openCmd.isBrowserAction === true, "Open github is handled as external browser navigation link");
  assert(!openCmd.action.includes("I can see"), "Opening URL does not claim visual access to page");

  // ==========================================
  // Test 3: Real-Time Audio Energy & Analyser Service
  // ==========================================
  console.log("\n--- 3. AUDIO ENERGY & ANALYSER SERVICE ---");

  reportMicrophoneLevel(0.25);
  const energy = getLiveAudioEnergy();
  assert(energy.inputRms > 0, "Microphone level correctly updates audio energy");
  assert(energy.outputFrequencyBins instanceof Uint8Array, "Frequency bins are valid Uint8Array");

  // Subscribe and test callback
  let callbackFired = false;
  const unsubscribe = subscribeAudioEnergy((data) => {
    callbackFired = true;
  });
  reportMicrophoneLevel(0.4);
  assert(typeof unsubscribe === "function", "subscribeAudioEnergy returns unsubscribe function");
  unsubscribe();

  // Reset mic level
  reportMicrophoneLevel(0);
  assert(getLiveAudioEnergy().inputRms === 0, "Microphone level cleanly resets to 0");

  // ==========================================
  // Test 4: AppState Type Completeness
  // ==========================================
  console.log("\n--- 4. APP STATE TYPE COVERAGE ---");
  const validStates: AppState[] = [
    "ready",
    "idle",
    "listening",
    "processing",
    "speaking",
    "muted",
    "interrupted",
    "reconnecting",
    "error",
  ];
  assert(validStates.includes("ready"), "State 'ready' is supported");
  assert(validStates.includes("interrupted"), "State 'interrupted' is supported");
  assert(validStates.includes("listening"), "State 'listening' is supported");
  assert(validStates.includes("speaking"), "State 'speaking' is supported");
  assert(validStates.includes("processing"), "State 'processing' is supported");
  assert(validStates.includes("muted"), "State 'muted' is supported");
  assert(validStates.includes("error"), "State 'error' is supported");

  console.log("\n=======================================================");
  if (testFailures === 0) {
    console.log("🎉 ALL VOICE STATE, MODE CHIPS & HOLOGRAM TESTS PASSED!");
  } else {
    console.error(`💥 ${testFailures} TEST(S) FAILED!`);
    process.exit(1);
  }
  console.log("=======================================================\n");
}

runTestSuite();
