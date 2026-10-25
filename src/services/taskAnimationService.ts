/**
 * Task Energy Streamer Service for Zoya AI
 * 
 * Coordinates real-time futuristic energy beams from the center Hologram
 * to any UI element being interacted with or automated by Zoya.
 * Inspired by reference image #2 (quantum core, gyroscopic vectors, orbital data trails).
 */

export interface TaskEnergyEvent {
  id: string;
  title: string;
  subtitle?: string;
  targetId?: string; // DOM element id or data-task-target
  targetSelector?: string;
  targetCoords?: { x: number; y: number; width?: number; height?: number };
  sourceCoords?: { x: number; y: number };
  duration?: number; // ms (default: 2400ms)
  type?: 'action' | 'navigation' | 'settings' | 'mode' | 'system' | 'external' | 'command';
  statusText?: string;
}

type TaskListener = (task: TaskEnergyEvent | null) => void;

class TaskAnimationService {
  private currentTask: TaskEnergyEvent | null = null;
  private listeners: Set<TaskListener> = new Set();
  private timer: any = null;
  private hologramAnchor: { x: number; y: number } | null = null;

  public setHologramAnchor(coords: { x: number; y: number }) {
    this.hologramAnchor = coords;
  }

  public getHologramAnchor(): { x: number; y: number } | null {
    return this.hologramAnchor;
  }

  public subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    listener(this.currentTask);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public trigger(event: Omit<TaskEnergyEvent, 'id'>): string {
    const id = `task-energy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullTask: TaskEnergyEvent = {
      id,
      duration: event.duration || 2600,
      type: event.type || 'action',
      ...event,
    };

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.currentTask = fullTask;
    this.notify();

    this.timer = setTimeout(() => {
      if (this.currentTask?.id === id) {
        this.currentTask = null;
        this.notify();
      }
    }, fullTask.duration);

    return id;
  }

  public clear() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.currentTask = null;
    this.notify();
  }

  public getCurrentTask(): TaskEnergyEvent | null {
    return this.currentTask;
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentTask);
      } catch (e) {
        console.error('[TaskAnimationService] Listener error:', e);
      }
    });
  }
}

export const taskAnimationService = new TaskAnimationService();

/**
 * Helper to dispatch task animations with warm natural language labels
 */
export function dispatchTaskEnergy(
  targetId: string,
  title: string,
  subtitle?: string,
  type: TaskEnergyEvent['type'] = 'action',
  duration: number = 2600
) {
  return taskAnimationService.trigger({
    targetId,
    title,
    subtitle,
    type,
    duration,
  });
}
