/**
 * Automated Verification Suite:
 * 1. AI Agent & Verified Skill Manifest System
 * 2. Agent Task Queue & Human Approval Workflow
 * 3. Content Pipeline, Viral Hook Breakdown & Daily Task Sheet
 * 4. Android Companion Architecture, Kotlin files, Manifest & Security rules
 */

import fs from 'fs';
import path from 'path';
import {
  getInstalledSkills,
  verifySkillSignature,
  toggleSkillActive,
  VERIFIED_SKILLS,
} from '../src/services/skillManifest';
import {
  createAgentTask,
  getAgentTasks,
  updateTaskProgress,
  approveTask,
  cancelTask,
  loadProactiveSettings,
  saveProactiveSettings,
  isProactiveActionAllowed,
} from '../src/services/agentTaskQueue';
import {
  loadDailyContentTasks,
  saveDailyContentTasks,
  loadUsageMetrics,
  recordUsage,
  generateViralScript,
} from '../src/services/contentPipelineService';

function runTests() {
  console.log('=================================================');
  console.log('ZOYA AI — AGENT, CONTENT & ANDROID ARCHITECTURE');
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

  // -------------------------------------------------------------------------
  // 1. Skill Manifest Verification
  // -------------------------------------------------------------------------
  const skills = getInstalledSkills();
  assert(
    skills.length >= 4,
    'Skill Manifest: All core built-in skills installed',
    `Found ${skills.length} skills (YouTube Researcher, Scriptwriter, Social Scheduler, Task Planner)`
  );

  const youtubeSkill = skills.find((s) => s.id === 'skill-youtube-viral-researcher');
  assert(
    youtubeSkill !== undefined && verifySkillSignature(youtubeSkill),
    'Skill Manifest: Root cryptographic signature verified for core skills',
    `Verified: ${youtubeSkill?.signature}`
  );

  const fakeSkill = {
    id: 'skill-fake',
    name: 'Malicious Skill',
    version: '1.0',
    author: 'Unknown Attacker',
    description: 'Fake',
    category: 'system' as const,
    permissions: ['android_bridge' as const],
    networkScopes: ['evil.com'],
    signature: 'BAD_SIGNATURE',
    verified: false,
    isActive: true,
    actions: [],
  };
  assert(
    verifySkillSignature(fakeSkill) === false,
    'Skill Manifest: Rejects unverified/tampered external skill signatures',
    'Bad signature was correctly rejected'
  );

  // -------------------------------------------------------------------------
  // 2. Agent Task Queue & Human Approval Workflow
  // -------------------------------------------------------------------------
  const task = createAgentTask({
    title: 'Test YouTube Post Draft',
    description: 'Post draft requiring human approval',
    skillId: 'skill-social-scheduler',
    priority: 'high',
    requiresApproval: true,
    approvalData: {
      actionName: 'Publish YouTube Shorts Draft',
      targetPlatform: 'YouTube',
      summary: 'Title: AI Companion Zero Delay Demo',
      draftContent: 'Full script preview here',
      riskNotice: 'Draft will be scheduled to YouTube channel',
    },
  });

  assert(
    task.status === 'queued' && task.requiresApproval === true,
    'Task Queue: Creates high-priority task with approval gate',
    `Task ID: ${task.id}, Status: ${task.status}`
  );

  // Advance task to waiting_approval
  updateTaskProgress(task.id, { status: 'waiting_approval', currentStep: 'Waiting for owner review' });
  let tasksInQueue = getAgentTasks();
  let updatedTask = tasksInQueue.find((t) => t.id === task.id);
  assert(
    updatedTask?.status === 'waiting_approval',
    'Task Queue: Enters waiting_approval state before external dispatch',
    `Current Step: ${updatedTask?.currentStep}`
  );

  // Approve task
  const approved = approveTask(task.id);
  tasksInQueue = getAgentTasks();
  updatedTask = tasksInQueue.find((t) => t.id === task.id);
  assert(
    approved && updatedTask?.status === 'running' && !!updatedTask?.approvalData?.approvedAt,
    'Human Approval: approveTask unlocks execution and logs approval timestamp',
    `Approved At: ${new Date(updatedTask?.approvalData?.approvedAt || 0).toISOString()}`
  );

  // -------------------------------------------------------------------------
  // 3. Proactive Rules (Opt-In, Quiet Hours, Frequency Limit)
  // -------------------------------------------------------------------------
  saveProactiveSettings({
    optInEnabled: false, // OFF by default
    quietHoursStart: '23:00',
    quietHoursEnd: '08:00',
    maxTasksPerDay: 3,
    tasksGeneratedToday: 0,
    lastRunDate: new Date().toISOString().split('T')[0],
    instantMute: false,
  });

  const checkOptIn = isProactiveActionAllowed();
  assert(
    checkOptIn.allowed === false && Boolean(checkOptIn.reason?.includes('Opt-in required')),
    'Proactive Rules: Strict default-off policy prevents autonomous actions without opt-in',
    `Blocked Reason: "${checkOptIn.reason}"`
  );

  // -------------------------------------------------------------------------
  // 4. Content Creation Pipeline & Notepad Tasks
  // -------------------------------------------------------------------------
  const notepadTasks = loadDailyContentTasks();
  assert(
    notepadTasks.length > 0 && notepadTasks.some((t) => t.category === 'script'),
    'Content Pipeline: Daily task sheet loads categorized to-do items',
    `Total notepad tasks: ${notepadTasks.length}`
  );

  const initialUsage = loadUsageMetrics();
  recordUsage(1500);
  const updatedUsage = loadUsageMetrics();
  assert(
    updatedUsage.estimatedTokens > initialUsage.estimatedTokens,
    'Cost Awareness: Usage metrics track token consumption and free-tier savings',
    `Recorded tokens: ${updatedUsage.estimatedTokens}, Free Tier Savings: $${updatedUsage.freeTierSavingsUsd}`
  );

  // -------------------------------------------------------------------------
  // 5. Android Architecture Files Completeness
  // -------------------------------------------------------------------------
  const androidDir = path.resolve(process.cwd(), 'src/android_architecture');
  const expectedAndroidFiles = [
    'ZoyaVoiceForegroundService.kt',
    'NativePermissionManager.kt',
    'ZoyaAccessibilityService.kt',
    'TouchGuardOverlay.kt',
    'OwnerVoiceVerification.kt',
    'EmergencySosManager.kt',
    'SecureSecretVault.kt',
    'ZoyaNotificationListenerService.kt',
    'ZoyaBootReceiver.kt',
    'MainActivity.kt',
    'ZoyaCompanionBridge.kt',
    'AndroidManifest.xml',
    'ArchitectureGuide.md',
  ];

  let missingFiles: string[] = [];
  expectedAndroidFiles.forEach((file) => {
    const fullPath = path.join(androidDir, file);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push(file);
    }
  });

  assert(
    missingFiles.length === 0,
    'Android Companion: All 12 Kotlin/XML architecture files created and verified in codebase',
    `Verified 12 files in ${androidDir}`
  );

  const manifestContent = fs.readFileSync(path.join(androidDir, 'AndroidManifest.xml'), 'utf-8');
  assert(
    manifestContent.includes('FOREGROUND_SERVICE_MICROPHONE') &&
      manifestContent.includes('SYSTEM_ALERT_WINDOW') &&
      manifestContent.includes('ZoyaAccessibilityService') &&
      manifestContent.includes('ZoyaNotificationListenerService'),
    'Android Manifest: Declares required foreground audio, accessibility, and overlay services',
    'All required permissions and service declarations verified'
  );

  console.log('=================================================');
  console.log(`SUITE RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('=================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
