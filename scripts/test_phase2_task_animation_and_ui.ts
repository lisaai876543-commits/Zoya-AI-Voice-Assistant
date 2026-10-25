import { taskAnimationService, dispatchTaskEnergy, TaskEnergyEvent } from '../src/services/taskAnimationService';
import { processCommand } from '../src/services/commandService';
import { getActiveTheme, setActiveTheme, getNextTheme, ZOEY_THEMES, THEME_ORDER } from '../src/utils/themeManager';
import assert from 'assert';

console.log("=================================================");
console.log("  ZOYA PHASE 2 - REAL-TIME TASK ANIMATION & UI TEST");
console.log("=================================================\n");

let passed = 0;
let total = 0;

function test(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}:`, err.message);
  }
}

// 1. Task Animation Service Tests
test("TaskAnimationService initializes and allows subscription", () => {
  let received: any = null;
  const unsub = taskAnimationService.subscribe((task) => {
    received = task;
  });

  const eventId = dispatchTaskEnergy(
    "task-target-mode-late-night",
    "Late Night Mode",
    "Tuning calm wavelength",
    "mode",
    1500
  );

  assert.ok(eventId, "Should return event ID");
  assert.ok(received, "Subscriber should receive the event");
  assert.strictEqual(received!.title, "Late Night Mode");
  assert.strictEqual(received!.targetId, "task-target-mode-late-night");
  assert.strictEqual(received!.type, "mode");

  taskAnimationService.clear();
  assert.strictEqual(taskAnimationService.getCurrentTask(), null);
  unsub();
});

test("Hologram anchor coordinates can be set and retrieved", () => {
  taskAnimationService.setHologramAnchor({ x: 250, y: 320 });
  const anchor = taskAnimationService.getHologramAnchor();
  assert.deepStrictEqual(anchor, { x: 250, y: 320 });
});

// 2. Command Service & Voice Theme Integration Tests
test("Voice command 'Zoya, change theme' cycles theme and dispatches task energy", () => {
  let capturedTask: any = null;
  const unsub = taskAnimationService.subscribe((t) => {
    capturedTask = t;
  });

  const prevTheme = getActiveTheme();
  const res = processCommand("Zoya, next theme", "Usman");

  assert.ok(res.action.includes("Theme Switched"), "Action should indicate theme switch");
  assert.strictEqual(res.isBrowserAction, false);
  const newTheme = getActiveTheme();
  assert.notStrictEqual(newTheme.id, prevTheme.id, "Theme should have cycled");
  assert.ok(capturedTask, "Should have dispatched a task animation event");
  assert.strictEqual(capturedTask!.targetId, "task-target-theme-btn");

  unsub();
});

test("Voice command 'Zoya, change theme to Crimson Blaze' sets exact theme and dispatches energy", () => {
  let capturedTask: any = null;
  const unsub = taskAnimationService.subscribe((t) => {
    capturedTask = t;
  });

  const res = processCommand("Zoya, change theme to Crimson Blaze", "Usman");
  assert.ok(res.action.includes("Crimson Blaze"));
  const active = getActiveTheme();
  assert.strictEqual(active.id, "crimson-blaze");
  assert.strictEqual(active.primary, "#FF2A4D");
  assert.strictEqual(active.secondary, "#FF6B00");
  assert.strictEqual(active.glow, "#FF3C00");
  assert.strictEqual(active.bg, "#120508");

  assert.ok(capturedTask);
  assert.strictEqual(capturedTask!.targetId, "task-target-theme-btn");
  assert.ok(capturedTask!.title.includes("Crimson Blaze"));

  unsub();
});

// 3. Browser & Media Action Dispatches
test("Media command 'Play Kesariya on YouTube' dispatches energy to action card", () => {
  let capturedTask: any = null;
  const unsub = taskAnimationService.subscribe((t) => {
    capturedTask = t;
  });

  const res = processCommand("play Kesariya on youtube", "Usman");
  assert.strictEqual(res.isBrowserAction, true);
  assert.ok(res.url?.includes("youtube.com"));
  assert.ok(capturedTask);
  assert.strictEqual(capturedTask!.targetId, "task-target-action-card");
  assert.strictEqual(capturedTask!.type, "external");

  unsub();
});

test("Spotify command 'Search Coke Studio on Spotify' dispatches energy to action card", () => {
  let capturedTask: any = null;
  const unsub = taskAnimationService.subscribe((t) => {
    capturedTask = t;
  });

  const res = processCommand("search Coke Studio on spotify", "Usman");
  assert.strictEqual(res.isBrowserAction, true);
  assert.ok(res.url?.includes("spotify.com"));
  assert.ok(capturedTask);
  assert.strictEqual(capturedTask!.targetId, "task-target-action-card");

  unsub();
});

test("WhatsApp draft command dispatches energy to action card", () => {
  let capturedTask: any = null;
  const unsub = taskAnimationService.subscribe((t) => {
    capturedTask = t;
  });

  const res = processCommand("send a whatsapp message to +923001234567 saying Salam Zoya", "Usman");
  assert.strictEqual(res.isBrowserAction, true);
  assert.ok(res.url?.includes("web.whatsapp.com"));
  assert.ok(capturedTask);
  assert.strictEqual(capturedTask!.targetId, "task-target-action-card");

  unsub();
});

test("Native Android action command dispatches energy to Android tab", () => {
  let capturedTask: any = null;
  const unsub = taskAnimationService.subscribe((t) => {
    capturedTask = t;
  });

  const res = processCommand("read my screen", "Usman");
  assert.strictEqual(res.isNativeOnly, true);
  assert.ok(res.action.includes("Native Android Companion"));
  assert.ok(capturedTask);
  assert.strictEqual(capturedTask!.targetId, "task-target-nav-android");

  unsub();
});

// 4. Validate All 10 Themes Intact
test("Verify exact 10 themes and hex definitions are completely intact", () => {
  assert.strictEqual(THEME_ORDER.length, 10);
  assert.strictEqual(ZOEY_THEMES["quantum-cyan"].primary, "#00F0FF");
  assert.strictEqual(ZOEY_THEMES["crimson-blaze"].primary, "#FF2A4D");
  assert.strictEqual(ZOEY_THEMES["amethyst-void"].primary, "#BF5AFF");
  assert.strictEqual(ZOEY_THEMES["emerald-pulse"].primary, "#00FF9D");
  assert.strictEqual(ZOEY_THEMES["arctic-silver"].primary, "#E8F4FF");
  assert.strictEqual(ZOEY_THEMES["solar-gold"].primary, "#FFB300");
  assert.strictEqual(ZOEY_THEMES["deep-ocean"].primary, "#00B4FF");
  assert.strictEqual(ZOEY_THEMES["rose-nebula"].primary, "#FF6BCB");
  assert.strictEqual(ZOEY_THEMES["neon-aurora"].primary, "#00F5A0");
  assert.strictEqual(ZOEY_THEMES["neon-aurora"].buttonGradient, "linear-gradient(135deg, #00F5A0 0%, #00D4FF 100%)");
  assert.strictEqual(ZOEY_THEMES["midnight-violet"].primary, "#9D4EDD");
});

console.log(`\n=================================================`);
console.log(`  PHASE 2 RESULTS: ${passed}/${total} TESTS PASSED (${((passed/total)*100).toFixed(0)}%)`);
console.log(`=================================================\n`);

if (passed !== total) {
  process.exit(1);
}
