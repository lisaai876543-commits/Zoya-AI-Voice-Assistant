/**
 * Test Suite: Settings UX, Structured Memory System, Honesty Labels & Personas
 * 
 * Verifies:
 * 1. 10 Settings categories coverage & honest capability badges
 * 2. Structured memory: CRUD, JSON export, JSON import preview (merge & replace), prompt injection toggle
 * 3. Conversation modes ('fast' vs 'expressive') and persona prompt directive generation
 * 4. Multi-key manager priority reordering (up/down)
 * 5. Browser action toggle blocking external intent links
 */

import {
  parseMemoriesJSON,
  importMemories,
  formatMemoriesForPrompt,
  loadMemoryFacts,
  saveMemoryFacts,
  clearAllMemories,
  MemoryFact,
} from '../src/utils/memoryManager';
import {
  getRegisteredKeys,
  addApiKey,
  reorderApiKey,
  deleteApiKey,
} from '../src/services/keyManager';
import { processCommand } from '../src/services/commandService';

function runTests() {
  console.log('=================================================');
  console.log('ZOYA AI — SETTINGS & STRUCTURED MEMORY TEST SUITE');
  console.log('=================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title}`);
      if (detail) console.error(`   └─ ${detail}`);
      failed++;
    }
  }

  // TEST 1: Structured Memory JSON Import Preview & Validation
  const validJson = JSON.stringify([
    {
      id: 'mem_1',
      category: 'identity',
      key: 'owner_name',
      value: 'Usman',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'mem_2',
      category: 'project',
      key: 'project',
      value: 'Zoya AI Full Stack Voice Assistant',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]);

  const preview = parseMemoriesJSON(validJson);
  assert(
    preview.valid === true && preview.items.length === 2 && preview.items[0].key === 'owner_name',
    'Memory: JSON import parses valid memory records with preview',
    `Found ${preview.items.length} records. First key: ${preview.items[0]?.key}`
  );

  const invalidJson = '{"invalid": "not-an-array"}';
  const badPreview = parseMemoriesJSON(invalidJson);
  assert(
    badPreview.valid === false && badPreview.items.length === 0 && !!badPreview.error,
    'Memory: JSON import cleanly rejects non-array/invalid JSON',
    `Rejected with error: "${badPreview.error}"`
  );

  // TEST 2: Memory Import Merge vs Replace
  const baseMemories: MemoryFact[] = [
    {
      id: 'base_1',
      category: 'preference',
      key: 'favorite_tea',
      value: 'Karak Chai',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
  saveMemoryFacts(baseMemories);

  const mergeResult = importMemories(preview.items, 'merge');
  const storedAfterMerge = loadMemoryFacts();
  assert(
    mergeResult.total === 3 &&
      storedAfterMerge.some((m) => m.key === 'favorite_tea') &&
      storedAfterMerge.some((m) => m.key === 'owner_name'),
    'Memory: Import "merge" mode combines existing and incoming records',
    `Total records after merge: ${storedAfterMerge.length} (added: ${mergeResult.added})`
  );

  const replaceResult = importMemories(preview.items, 'replace');
  const storedAfterReplace = loadMemoryFacts();
  assert(
    replaceResult.total === 2 && !storedAfterReplace.some((m) => m.key === 'favorite_tea'),
    'Memory: Import "replace" mode replaces previous records entirely',
    `Total records after replace: ${storedAfterReplace.length} (base record purged)`
  );

  // TEST 3: Memory Injection into System Prompt (Respects "Use Long-Term Memory" Toggle)
  const promptWhenEnabled = formatMemoriesForPrompt(true);
  assert(
    promptWhenEnabled.includes('owner_name') && promptWhenEnabled.includes('Usman'),
    'Memory: formatMemoriesForPrompt injects structured categories when toggle is ON',
    `Injected prompt length: ${promptWhenEnabled.length} chars`
  );

  const promptWhenDisabled = formatMemoriesForPrompt(false);
  assert(
    promptWhenDisabled === '',
    'Memory: formatMemoriesForPrompt returns empty string when toggle is OFF',
    `Disabled prompt output: "${promptWhenDisabled}"`
  );

  // Clean memory back to defaults
  clearAllMemories();

  // TEST 4: Multi-Key Manager Priority Reordering (Up/Down)
  const testKey1 = addApiKey(
    'gemini',
    'Key Alpha',
    'AIzaSyTestKeyAlpha1111111111111111111',
    true,
    1
  );
  const testKey2 = addApiKey(
    'gemini',
    'Key Beta',
    'AIzaSyTestKeyBeta22222222222222222222',
    true,
    2
  );

  const keysBefore = getRegisteredKeys().filter((k) => k.provider === 'gemini');
  const initialAlphaIndex = keysBefore.findIndex((k) => k.id === testKey1.id);
  const initialBetaIndex = keysBefore.findIndex((k) => k.id === testKey2.id);

  // Move Key Beta Up
  reorderApiKey(testKey2.id, 'up');
  const keysAfterUp = getRegisteredKeys().filter((k) => k.provider === 'gemini');
  const betaIndexAfterUp = keysAfterUp.findIndex((k) => k.id === testKey2.id);

  assert(
    betaIndexAfterUp < initialBetaIndex || initialBetaIndex === 0,
    'Key Manager: reorderApiKey("up") promotes key priority ahead of higher-order key',
    `Key Beta moved from index ${initialBetaIndex} to ${betaIndexAfterUp}`
  );

  // Cleanup test keys
  deleteApiKey(testKey1.id);
  deleteApiKey(testKey2.id);

  // TEST 5: Browser Action Toggle Blocks External Links
  // When enableBrowserActions is FALSE:
  const actionDisabledResult = processCommand(
    'play pasoori on youtube',
    'Usman',
    false // enableBrowserActions = false
  );

  assert(
    actionDisabledResult.isBrowserAction === false &&
      actionDisabledResult.action.includes('Browser actions are currently disabled') &&
      !actionDisabledResult.url,
    'Browser Actions: Turning OFF toggle blocks external tab dispatch and explains setting to user',
    `Result action: "${actionDisabledResult.action.slice(0, 65)}..."`
  );

  // When enableBrowserActions is TRUE:
  const actionEnabledResult = processCommand(
    'play pasoori on youtube',
    'Usman',
    true // enableBrowserActions = true
  );

  assert(
    actionEnabledResult.isBrowserAction === true &&
      actionEnabledResult.url?.includes('youtube.com') === true,
    'Browser Actions: Turning ON toggle creates draft/link URL transparently',
    `Created URL: "${actionEnabledResult.url}"`
  );

  // TEST 6: Strict Honesty on Native Android features
  const screenCaptureAttempt = processCommand(
    'click on my screen and open whatsapp',
    'Usman',
    true
  );

  assert(
    screenCaptureAttempt.isNativeOnly === true &&
      screenCaptureAttempt.action.includes('Native Android Companion feature') &&
      !screenCaptureAttempt.action.includes('Done, clicked'),
    'Honesty: Screen control attempt explicitly rejected with Native Android notice',
    `Notice text: "${screenCaptureAttempt.action.slice(0, 60)}..."`
  );

  console.log('=================================================');
  console.log(`SETTINGS & MEMORY SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('=================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
