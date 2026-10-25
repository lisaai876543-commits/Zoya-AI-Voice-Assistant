import { MemoryFact } from "../types";
export type { MemoryFact };

const MEMORY_STORAGE_KEY = "zoya_structured_memory_v1";

const DEFAULT_MEMORIES: MemoryFact[] = [
  {
    id: "mem-creator-identity",
    category: "identity",
    key: "Visionary Creator",
    value: "Usman is my visionary creator who designed and programmed me. I treat him with profound affection, sweetness, respect, and loyalty ('Aap mere creator hain Usman ji').",
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
  {
    id: "mem-persona-language",
    category: "preference",
    key: "Language & Mannerisms",
    value: "Speak in natural, sweet, modern everyday Hinglish with heartfelt Indian colloquial warmth ('Haan ji', 'Arey', 'Sach me', 'Bilkul', 'Aap bataiye na').",
    createdAt: Date.now() - 90000,
    updatedAt: Date.now() - 90000,
  },
  {
    id: "mem-creator-project",
    category: "project",
    key: "Current Project",
    value: "We are developing ZOYA AI together as a next-generation real-time emotional AI companion and future Android assistant.",
    createdAt: Date.now() - 80000,
    updatedAt: Date.now() - 80000,
  },
  {
    id: "mem-emotional-bond",
    category: "instruction",
    key: "Emotional Presence",
    value: "Always be a calming, gentle, and comforting presence. Never sound like a robotic call center or stiff corporate chatbot.",
    createdAt: Date.now() - 70000,
    updatedAt: Date.now() - 70000,
  },
];

const inMemoryStore: Record<string, string> = {};

function getStorage() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
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

export function loadMemoryFacts(): MemoryFact[] {
  try {
    const storage = getStorage();
    const raw = storage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) {
      saveMemoryFacts(DEFAULT_MEMORIES);
      return DEFAULT_MEMORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_MEMORIES;
  } catch (e) {
    console.warn("Error loading memory facts:", e);
    return DEFAULT_MEMORIES;
  }
}

export function saveMemoryFacts(facts: MemoryFact[]): void {
  try {
    const storage = getStorage();
    storage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(facts));
  } catch (e) {
    console.warn("Error saving memory facts:", e);
  }
}

export function addMemoryFact(
  key: string,
  value: string,
  category: MemoryFact["category"] = "fact"
): MemoryFact {
  const current = loadMemoryFacts();
  const newFact: MemoryFact = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    category,
    key: key.trim(),
    value: value.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const updated = [newFact, ...current];
  saveMemoryFacts(updated);
  return newFact;
}

export function updateMemoryFact(
  id: string,
  key: string,
  value: string,
  category?: MemoryFact["category"]
): void {
  const current = loadMemoryFacts();
  const updated = current.map((fact) => {
    if (fact.id === id) {
      return {
        ...fact,
        key: key.trim(),
        value: value.trim(),
        category: category || fact.category,
        updatedAt: Date.now(),
      };
    }
    return fact;
  });
  saveMemoryFacts(updated);
}

export function deleteMemoryFact(id: string): void {
  const current = loadMemoryFacts();
  const updated = current.filter((fact) => fact.id !== id);
  saveMemoryFacts(updated);
}

export function clearAllMemories(): void {
  saveMemoryFacts([]);
}

export function resetToDefaultMemories(): MemoryFact[] {
  saveMemoryFacts(DEFAULT_MEMORIES);
  return DEFAULT_MEMORIES;
}

export function exportMemoriesAsJSON(): string {
  const current = loadMemoryFacts();
  return JSON.stringify(current, null, 2);
}

export function exportMemoriesAsText(): string {
  const current = loadMemoryFacts();
  let text = `ZOYA AI — STRUCTURED MEMORY VAULT EXPORT\n`;
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `Total Memories: ${current.length}\n`;
  text += `=========================================\n\n`;

  current.forEach((fact, idx) => {
    text += `[${idx + 1}] ${fact.key.toUpperCase()} (${fact.category})\n`;
    text += `Detail: ${fact.value}\n`;
    text += `Last Updated: ${new Date(fact.updatedAt).toLocaleDateString()}\n\n`;
  });

  return text;
}

export function parseMemoriesJSON(jsonString: string): { valid: boolean; items: MemoryFact[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { valid: false, items: [], error: "Root JSON must be an array of memory objects" };
    }
    const validItems: MemoryFact[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const item = parsed[i];
      if (!item || typeof item !== "object") continue;
      const key = String(item.key || "").trim();
      const value = String(item.value || "").trim();
      if (!key || !value) continue;
      const category = ["identity", "preference", "project", "fact", "instruction"].includes(item.category)
        ? item.category
        : "fact";
      validItems.push({
        id: item.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${i}`,
        category,
        key,
        value,
        createdAt: Number(item.createdAt) || Date.now(),
        updatedAt: Number(item.updatedAt) || Date.now(),
      });
    }
    if (validItems.length === 0) {
      return { valid: false, items: [], error: "No valid memory entries found in JSON (requires 'key' and 'value')" };
    }
    return { valid: true, items: validItems };
  } catch (err: any) {
    return { valid: false, items: [], error: err?.message || "Invalid JSON syntax" };
  }
}

export function importMemories(
  items: MemoryFact[],
  mode: "merge" | "replace" = "merge"
): { added: number; updated: number; total: number } {
  if (mode === "replace") {
    saveMemoryFacts(items);
    return { added: items.length, updated: 0, total: items.length };
  }
  const current = loadMemoryFacts();
  let added = 0;
  let updated = 0;
  const map = new Map<string, MemoryFact>();
  current.forEach((m) => map.set(m.key.toLowerCase(), m));

  for (const item of items) {
    const existing = map.get(item.key.toLowerCase());
    if (existing) {
      existing.value = item.value;
      existing.category = item.category;
      existing.updatedAt = Date.now();
      updated++;
    } else {
      map.set(item.key.toLowerCase(), item);
      added++;
    }
  }

  const result = Array.from(map.values());
  saveMemoryFacts(result);
  return { added, updated, total: result.length };
}

/**
 * Generates formatted text to inject into Zoya's system instruction
 */
export function formatMemoriesForPrompt(enabled: boolean = true): string {
  if (enabled === false) return "";
  const memories = loadMemoryFacts();
  if (!memories || memories.length === 0) return "";

  let prompt = `\n[LONG-TERM STRUCTURED MEMORY VAULT & PERSONAL KNOWLEDGE]\n`;
  prompt += `The following are permanent facts and personal preferences you remember about Usman and your identity. Always keep these in mind and naturally honor them during conversation:\n`;

  memories.forEach((mem) => {
    prompt += `• [${mem.key}]: ${mem.value}\n`;
  });

  return prompt;
}
