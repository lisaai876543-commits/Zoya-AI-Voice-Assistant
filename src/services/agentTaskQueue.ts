/**
 * Agent Task Queue & Human Approval Pipeline for Zoey AI
 * 
 * Manages asynchronous long-running background tasks with:
 * - State lifecycle: queued → running → waiting_approval → paused → failed → completed
 * - Multi-step human approval pipeline: Draft → Preview → User Approve → Execute → Result
 * - Checkpointing, retry policy, execution logs, and output artifacts
 * - Proactive respect rules: Opt-in, Quiet hours, Daily frequency limit, Instant mute
 */

export type TaskStatus = 
  | 'queued' 
  | 'running' 
  | 'waiting_approval' 
  | 'paused' 
  | 'failed' 
  | 'completed';

export type TaskPriority = 'high' | 'normal' | 'low';

export interface TaskLogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'approval';
  message: string;
}

export interface ApprovalPayload {
  actionName: string;
  targetPlatform?: string;
  summary: string;
  draftContent: string;
  riskNotice: string;
  approvedAt?: number;
}

export interface TaskArtifact {
  id: string;
  name: string;
  type: 'script' | 'research' | 'tags' | 'draft_post' | 'json';
  content: string;
  createdAt: number;
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  skillId: string;
  status: TaskStatus;
  priority: TaskPriority;
  progressPercent: number; // 0 to 100
  currentStep: string;
  totalSteps: number;
  currentStepIndex: number;
  retryCount: number;
  maxRetries: number;
  requiresApproval: boolean;
  approvalData?: ApprovalPayload;
  logs: TaskLogEntry[];
  artifacts: TaskArtifact[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  lastError?: string;
}

export interface ProactiveSettings {
  optInEnabled: boolean;
  quietHoursStart: string; // "23:00"
  quietHoursEnd: string;   // "08:00"
  maxTasksPerDay: number;
  tasksGeneratedToday: number;
  lastRunDate: string;     // "YYYY-MM-DD"
  instantMute: boolean;
}

const TASK_QUEUE_STORAGE_KEY = '_zoya_agent_tasks_v2';
const PROACTIVE_SETTINGS_KEY = '_zoya_proactive_settings_v1';

const inMemoryStore: Record<string, string> = {};

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: (k: string) => (k in inMemoryStore ? inMemoryStore[k] : null),
    setItem: (k: string, v: string) => {
      inMemoryStore[k] = String(v);
    },
    removeItem: (k: string) => {
      delete inMemoryStore[k];
    },
  };
}

export function loadProactiveSettings(): ProactiveSettings {
  const defaultSettings: ProactiveSettings = {
    optInEnabled: false, // Default OFF - strictly opt-in!
    quietHoursStart: '23:00',
    quietHoursEnd: '08:00',
    maxTasksPerDay: 3,
    tasksGeneratedToday: 0,
    lastRunDate: new Date().toISOString().split('T')[0],
    instantMute: false,
  };

  try {
    const storage = getStorage();
    const raw = storage.getItem(PROACTIVE_SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    // Reset daily counter on date change
    if (parsed.lastRunDate !== today) {
      parsed.lastRunDate = today;
      parsed.tasksGeneratedToday = 0;
    }
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

export function saveProactiveSettings(settings: ProactiveSettings): void {
  try {
    const storage = getStorage();
    storage.setItem(PROACTIVE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Failed to save proactive settings:', err);
  }
}

/**
 * Checks whether proactive generation is currently allowed (quiet hours, frequency cap, opt-in)
 */
export function isProactiveActionAllowed(): { allowed: boolean; reason?: string } {
  const settings = loadProactiveSettings();
  if (!settings.optInEnabled) {
    return { allowed: false, reason: 'Proactive autonomous agent mode is disabled (Opt-in required)' };
  }
  if (settings.instantMute) {
    return { allowed: false, reason: 'Instant Mute is active' };
  }

  // Check Quiet Hours
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  const isQuietTime = startMinutes > endMinutes
    ? currentMinutes >= startMinutes || currentMinutes < endMinutes
    : currentMinutes >= startMinutes && currentMinutes < endMinutes;

  if (isQuietTime) {
    return { allowed: false, reason: `Currently within Quiet Hours (${settings.quietHoursStart} - ${settings.quietHoursEnd})` };
  }

  // Check Daily frequency cap
  if (settings.tasksGeneratedToday >= settings.maxTasksPerDay) {
    return { allowed: false, reason: `Daily limit reached (${settings.maxTasksPerDay} tasks/day)` };
  }

  return { allowed: true };
}

/**
 * Load all tasks in queue
 */
export function getAgentTasks(): AgentTask[] {
  try {
    const storage = getStorage();
    const raw = storage.getItem(TASK_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAgentTasks(tasks: AgentTask[]): void {
  try {
    const storage = getStorage();
    storage.setItem(TASK_QUEUE_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.warn('Failed to save tasks to localStorage:', err);
  }
}

/**
 * Create a new task in queue
 */
export function createAgentTask(params: {
  title: string;
  description: string;
  skillId: string;
  priority?: TaskPriority;
  requiresApproval?: boolean;
  approvalData?: ApprovalPayload;
}): AgentTask {
  const tasks = getAgentTasks();
  const newTask: AgentTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: params.title,
    description: params.description,
    skillId: params.skillId,
    status: 'queued',
    priority: params.priority || 'normal',
    progressPercent: 0,
    currentStep: 'Task queued for execution',
    totalSteps: 4,
    currentStepIndex: 0,
    retryCount: 0,
    maxRetries: 3,
    requiresApproval: !!params.requiresApproval,
    approvalData: params.approvalData,
    logs: [
      {
        timestamp: Date.now(),
        level: 'info',
        message: `Task created and placed in ${params.priority || 'normal'} queue`,
      },
    ],
    artifacts: [],
    createdAt: Date.now(),
  };

  tasks.unshift(newTask);
  saveAgentTasks(tasks);
  return newTask;
}

/**
 * Update a task's status or progress
 */
export function updateTaskProgress(
  taskId: string,
  updates: Partial<AgentTask>,
  newLogMessage?: { level: TaskLogEntry['level']; message: string }
): void {
  const tasks = getAgentTasks();
  const taskIndex = tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) return;

  const current = tasks[taskIndex];
  const newLogs = [...current.logs];
  if (newLogMessage) {
    newLogs.push({
      timestamp: Date.now(),
      level: newLogMessage.level,
      message: newLogMessage.message,
    });
  }

  tasks[taskIndex] = {
    ...current,
    ...updates,
    logs: newLogs,
  };
  saveAgentTasks(tasks);
}

/**
 * Approve a waiting task and resume execution
 */
export function approveTask(taskId: string): boolean {
  const tasks = getAgentTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.status !== 'waiting_approval') return false;

  updateTaskProgress(
    taskId,
    {
      status: 'running',
      approvalData: task.approvalData
        ? { ...task.approvalData, approvedAt: Date.now() }
        : undefined,
    },
    { level: 'approval', message: 'Owner approved task. Resuming execution...' }
  );
  return true;
}

/**
 * Reject / Cancel a task
 */
export function cancelTask(taskId: string, reason: string = 'Cancelled by owner'): void {
  updateTaskProgress(
    taskId,
    {
      status: 'failed',
      lastError: reason,
      completedAt: Date.now(),
    },
    { level: 'warn', message: `Task halted: ${reason}` }
  );
}

/**
 * Retry a failed task
 */
export function retryTask(taskId: string): void {
  const tasks = getAgentTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  updateTaskProgress(
    taskId,
    {
      status: 'queued',
      progressPercent: 0,
      retryCount: task.retryCount + 1,
      lastError: undefined,
    },
    { level: 'info', message: `Retrying task (Attempt #${task.retryCount + 1})` }
  );
}

/**
 * Clear completed and failed tasks
 */
export function clearFinishedTasks(): void {
  const tasks = getAgentTasks();
  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'waiting_approval' || t.status === 'queued');
  saveAgentTasks(activeTasks);
}
