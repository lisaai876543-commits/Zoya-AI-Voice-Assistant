import {
  IMPLEMENTED_FEATURES,
  getImplementedFeaturesDescription,
  getDashboardControlsDescription,
} from "../src/services/appRegistry";
import {
  addApiKey,
  getRegisteredKeys,
  getActiveKey,
  reportKeyQuotaExhausted,
  clearAllKeys,
  getKeyVaultSettings,
  saveKeyVaultSettings,
  maskKey,
} from "../src/services/keyManager";
import { processCommand } from "../src/services/commandService";

console.log("=================================================");
console.log("ZOYA AI — PHASE 0 VERIFICATION TEST SUITE");
console.log("=================================================");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${testName}`);
    if (detail) console.log(`   └─ ${detail}`);
  } else {
    failed++;
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error(`   └─ ${detail}`);
  }
}

// 1. AppRegistry Statuses & Native-Only Isolation
const nativeOnlyKeys = [
  "native-screen-reading",
  "native-ui-clicking",
  "native-touch-automation",
  "native-boot-start",
  "native-notification-reading",
  "native-call-control",
  "native-whatsapp-autoreply",
  "native-touch-guard",
  "native-sos-auto-actions",
];

const allNativeFound = nativeOnlyKeys.every((id) =>
  IMPLEMENTED_FEATURES.some((f) => f.id === id && (f.status === "native-only" || f.status === "unavailable-on-web"))
);

assert(
  allNativeFound,
  "Registry: All 9 system-level actions marked native-only or unavailable-on-web",
  `Found all 9 required features with strict native-only or unavailable-on-web status.`
);

// Check Creator & Supreme Brain context
const featurePrompt = getImplementedFeaturesDescription();
const hasSupremeBrain = featurePrompt.includes("Supreme Owner / Main Brain") || featurePrompt.includes("Supreme Main Brain");
const hasSubordinateJoey = featurePrompt.includes("Joey") && featurePrompt.includes("subordinate agent");
const hasChannelContext = featurePrompt.includes("YouTube") && featurePrompt.includes("TikTok") && featurePrompt.includes("Facebook");

assert(
  hasSupremeBrain && hasSubordinateJoey && hasChannelContext,
  "Registry: Owner Context & Supreme Brain Architecture",
  `Verified: Zoya is Supreme Brain, Joey is PC subordinate, Usman's YouTube/TikTok/Facebook channels included.`
);

// 2. Multi-Key Manager Functionality
clearAllKeys();
const key1 = addApiKey("gemini", "Gemini Free #1", "AIzaSyTestKeyOneFree12345", true, 1);
const key2 = addApiKey("gemini", "Gemini Free #2 (Backup)", "AIzaSyTestKeyTwoFree67890", true, 2);
const groqKey = addApiKey("groq", "Groq Backup", "gsk_test_groq_key_999", true, 3);

const activeFirst = getActiveKey("gemini");
assert(
  activeFirst === "AIzaSyTestKeyOneFree12345",
  "Multi-Key Manager: Priority order picks highest priority active key",
  `Active key is ${maskKey(activeFirst)} (Priority #1)`
);

// Simulate rate limit 429 quota exhaustion on key #1
const rotatedKey = reportKeyQuotaExhausted(activeFirst, "gemini", "HTTP 429 Quota Exceeded");
assert(
  rotatedKey === "AIzaSyTestKeyTwoFree67890",
  "Multi-Key Manager: Auto-rotation on 429 quota exhaustion",
  `Successfully auto-rotated from Key #1 to Key #2 (${maskKey(rotatedKey || "")})`
);

const keysAfterRotation = getRegisteredKeys();
const key1Record = keysAfterRotation.find((k) => k.id === key1.id);
assert(
  key1Record?.status === "cooldown" && (key1Record?.cooldownUntil || 0) > Date.now(),
  "Multi-Key Manager: Cooldown status recorded on exhausted key",
  `Exhausted key placed in cooldown until reset window.`
);

// Free tier settings toggle
saveKeyVaultSettings({ onlyUseFreeTier: true, autoRotateOnQuota: true, cooldownDurationMs: 900000 });
const settings = getKeyVaultSettings();
assert(
  settings.onlyUseFreeTier === true,
  "Multi-Key Manager: Free-tier first policy setting saved & retrieved",
  `Only Use Free Tier = true`
);

// Key Masking
assert(
  maskKey("AIzaSy1234567890abcdef") === "AIzaSy••••••••cdef",
  "Multi-Key Manager: Key masking for safe UI display",
  `Masked: ${maskKey("AIzaSy1234567890abcdef")}`
);

// 3. Honesty Rules in Command Parser
const screenCmd = processCommand("Can you read my screen and click the button?");
assert(
  screenCmd.isNativeOnly === true && screenCmd.action.includes("Native Android Companion"),
  "Honesty: Screen reading & clicking requests return honest Native Android notice",
  `Result: "${screenCmd.action.slice(0, 75)}..."`
);

const autoReplyCmd = processCommand("Auto reply to WhatsApp messages silently");
assert(
  autoReplyCmd.isNativeOnly === true && autoReplyCmd.action.includes("Native Android Companion"),
  "Honesty: Silent WhatsApp auto-reply returns honest Native Android notice",
  `Result: "${autoReplyCmd.action.slice(0, 75)}..."`
);

const waDraftCmd = processCommand("Send a WhatsApp message to +923001234567 saying Hello Usman");
assert(
  waDraftCmd.isBrowserAction === true &&
  waDraftCmd.action.includes("Draft Prepared") &&
  !waDraftCmd.action.toLowerCase().includes("sent successfully"),
  "Honesty: WhatsApp web action labeled 'Draft Prepared', never falsely claims 'Sent'",
  `Result: "${waDraftCmd.action}"`
);

const ytCmd = processCommand("Play Pasoori on YouTube");
assert(
  ytCmd.isBrowserAction === true && ytCmd.action.includes("Link Opened"),
  "Honesty: Media playback labeled 'Link Opened'",
  `Result: "${ytCmd.action}"`
);

// Clean up test vault
clearAllKeys();

console.log("=================================================");
console.log(`PHASE 0 RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("=================================================");
if (failed > 0) process.exit(1);
