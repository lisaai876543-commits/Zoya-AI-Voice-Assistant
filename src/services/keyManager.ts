import { GoogleGenAI } from "@google/genai";
import { getSecureApiKey, saveSecureApiKey } from "../utils/security";

export type KeyProvider = "gemini" | "groq" | "openrouter" | "custom";
export type KeyStatus = "active" | "exhausted" | "invalid" | "cooldown";

export interface ApiKeyRecord {
  id: string;
  provider: KeyProvider;
  label: string;
  key: string;
  priority: number; // 1 = highest priority, 2, 3...
  status: KeyStatus;
  isFreeTier: boolean;
  requestCount: number;
  lastUsed?: number;
  lastError?: string;
  cooldownUntil?: number;
  addedAt: number;
  baseUrl?: string;
}

export interface KeyVaultSettings {
  onlyUseFreeTier: boolean;
  autoRotateOnQuota: boolean;
  cooldownDurationMs: number; // default: 15 minutes
}

const VAULT_STORAGE_KEY = "_zoya_multi_key_vault_v2";
const SETTINGS_STORAGE_KEY = "_zoya_key_vault_settings_v1";
const SALT = "zoya_ai_multi_vault_2026";

/**
 * Client-side XOR obfuscation for vault storage
 */
function xorTransform(input: string, salt: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(input.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  }
  return result;
}

function encryptPayload(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    const xorred = xorTransform(jsonStr, SALT);
    return btoa(encodeURIComponent(xorred));
  } catch (err) {
    console.warn("Failed to encrypt vault payload:", err);
    return "";
  }
}

function decryptPayload<T>(ciphertext: string, fallback: T): T {
  try {
    const decoded = decodeURIComponent(atob(ciphertext));
    const raw = xorTransform(decoded, SALT);
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

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

export function getKeyVaultSettings(): KeyVaultSettings {
  const storage = getStorage();
  const stored = storage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return { onlyUseFreeTier: true, autoRotateOnQuota: true, cooldownDurationMs: 15 * 60 * 1000 };
  }
  return decryptPayload<KeyVaultSettings>(stored, {
    onlyUseFreeTier: true,
    autoRotateOnQuota: true,
    cooldownDurationMs: 15 * 60 * 1000,
  });
}

export function saveKeyVaultSettings(settings: KeyVaultSettings): void {
  const storage = getStorage();
  const encrypted = encryptPayload(settings);
  if (encrypted) {
    storage.setItem(SETTINGS_STORAGE_KEY, encrypted);
  }
}

/**
 * Load all registered keys from the secure vault.
 * Automatically migrates any legacy single key into the multi-key vault as Primary Gemini Free Key.
 */
export function getRegisteredKeys(): ApiKeyRecord[] {
  const storage = getStorage();
  const stored = storage.getItem(VAULT_STORAGE_KEY);
  let keys: ApiKeyRecord[] = [];

  if (stored) {
    keys = decryptPayload<ApiKeyRecord[]>(stored, []);
  }

  // Migration check: If vault is empty, check legacy single key storage
  if (keys.length === 0) {
    const legacyKey = getSecureApiKey();
    if (legacyKey && legacyKey !== "MY_GEMINI_API_KEY") {
      const initialKey: ApiKeyRecord = {
        id: "key-gemini-initial-1",
        provider: "gemini",
        label: "Primary Gemini Free Tier",
        key: legacyKey,
        priority: 1,
        status: "active",
        isFreeTier: true,
        requestCount: 0,
        addedAt: Date.now(),
      };
      keys = [initialKey];
      saveRegisteredKeys(keys);
    }
  }

  // Check if any cooldown keys have expired their cooldown period
  const now = Date.now();
  let modified = false;
  keys.forEach((k) => {
    if (k.status === "cooldown" && k.cooldownUntil && now >= k.cooldownUntil) {
      k.status = "active";
      k.cooldownUntil = undefined;
      modified = true;
    }
  });

  if (modified) {
    saveRegisteredKeys(keys);
  }

  return keys.sort((a, b) => a.priority - b.priority);
}

export function saveRegisteredKeys(keys: ApiKeyRecord[]): void {
  const storage = getStorage();
  const encrypted = encryptPayload(keys);
  if (encrypted) {
    storage.setItem(VAULT_STORAGE_KEY, encrypted);
  }
}

/**
 * Add a new API key to the vault
 */
export function addApiKey(
  provider: KeyProvider,
  label: string,
  key: string,
  isFreeTier: boolean = true,
  priority?: number,
  baseUrl?: string,
): ApiKeyRecord {
  const keys = getRegisteredKeys();
  const cleanKey = key.trim();
  const nextPriority = priority !== undefined ? priority : keys.length + 1;

  const newRecord: ApiKeyRecord = {
    id: `key-${provider}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    provider,
    label: label.trim() || `${provider.toUpperCase()} Key #${keys.length + 1}`,
    key: cleanKey,
    priority: nextPriority,
    status: "active",
    isFreeTier,
    requestCount: 0,
    addedAt: Date.now(),
    baseUrl: baseUrl?.trim(),
  };

  keys.push(newRecord);
  saveRegisteredKeys(keys);

  // If this is the highest priority Gemini key, also keep legacy single key storage in sync for compatibility
  if (provider === "gemini") {
    const highestGemini = keys
      .filter((k) => k.provider === "gemini" && k.status === "active")
      .sort((a, b) => a.priority - b.priority)[0];
    if (highestGemini) {
      saveSecureApiKey(highestGemini.key);
    }
  }

  return newRecord;
}

/**
 * Update an existing key record
 */
export function updateApiKey(id: string, updates: Partial<ApiKeyRecord>): void {
  const keys = getRegisteredKeys();
  const index = keys.findIndex((k) => k.id === id);
  if (index === -1) return;

  keys[index] = { ...keys[index], ...updates };
  saveRegisteredKeys(keys);
}

/**
 * Delete a key from the vault
 */
export function deleteApiKey(id: string): void {
  const keys = getRegisteredKeys().filter((k) => k.id !== id);
  saveRegisteredKeys(keys);

  // Update legacy single key with next best Gemini key
  const remainingGemini = keys.filter((k) => k.provider === "gemini" && k.status === "active");
  if (remainingGemini.length > 0) {
    saveSecureApiKey(remainingGemini[0].key);
  }
}

/**
 * Reorder key priorities up or down
 */
export function reorderApiKey(id: string, direction: "up" | "down"): void {
  const keys = getRegisteredKeys().sort((a, b) => a.priority - b.priority);
  const index = keys.findIndex((k) => k.id === id);
  if (index === -1) return;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= keys.length) return;

  const currentKey = keys[index];
  const targetKey = keys[targetIndex];
  const tempPriority = currentKey.priority;
  currentKey.priority = targetKey.priority;
  targetKey.priority = tempPriority;

  // Re-index cleanly 1..N
  keys.sort((a, b) => a.priority - b.priority);
  keys.forEach((k, idx) => {
    k.priority = idx + 1;
  });

  saveRegisteredKeys(keys);
}

/**
 * Clear all keys from the vault
 */
export function clearAllKeys(): void {
  const storage = getStorage();
  storage.removeItem(VAULT_STORAGE_KEY);
}

/**
 * Retrieves the currently optimal active key for a provider
 */
export function getActiveKey(provider: KeyProvider = "gemini"): string {
  const keys = getRegisteredKeys();
  const settings = getKeyVaultSettings();

  const matchingKeys = keys.filter((k) => {
    if (k.provider !== provider) return false;
    if (settings.onlyUseFreeTier && !k.isFreeTier) return false;
    return k.status === "active";
  });

  if (matchingKeys.length > 0) {
    return matchingKeys[0].key;
  }

  // If all active keys are exhausted, check if any is in cooldown and force earliest
  const inCooldown = keys.filter((k) => k.provider === provider && k.status === "cooldown");
  if (inCooldown.length > 0) {
    inCooldown.sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0));
    return inCooldown[0].key;
  }

  // Fallback to legacy single key or environment variable
  const legacyKey = getSecureApiKey();
  if (legacyKey && legacyKey !== "MY_GEMINI_API_KEY") return legacyKey;

  const envKey =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.VITE_GEMINI_API_KEY || ""
      : "";
  return envKey !== "MY_GEMINI_API_KEY" ? envKey : "";
}

/**
 * Marks a key as exhausted (429 rate limit or quota exceeded) and rotates to the next active key
 */
export function reportKeyQuotaExhausted(
  exhaustedKey: string,
  provider: KeyProvider = "gemini",
  errorMsg: string = "Quota exceeded / HTTP 429",
): string | null {
  const keys = getRegisteredKeys();
  const settings = getKeyVaultSettings();
  const cooldownDuration = settings.cooldownDurationMs || 15 * 60 * 1000;

  let matched = false;
  keys.forEach((k) => {
    if (k.key === exhaustedKey || (k.key && exhaustedKey && k.key.trim() === exhaustedKey.trim())) {
      k.status = "cooldown";
      k.lastError = errorMsg;
      k.cooldownUntil = Date.now() + cooldownDuration;
      matched = true;
    }
  });

  if (matched) {
    saveRegisteredKeys(keys);
  }

  // Pick the next available key
  const nextKey = getActiveKey(provider);
  if (nextKey && nextKey !== exhaustedKey) {
    console.info(`[KeyManager] Auto-rotated to backup key for ${provider}`);
    if (provider === "gemini") {
      saveSecureApiKey(nextKey);
    }
    return nextKey;
  }

  return null;
}

/**
 * Marks a key as invalid (bad credentials, 401/403)
 */
export function reportKeyInvalid(
  invalidKey: string,
  _provider: KeyProvider = "gemini",
  errorMsg: string = "Invalid API Key or Permission Denied",
): void {
  const keys = getRegisteredKeys();
  keys.forEach((k) => {
    if (k.key === invalidKey || (k.key && invalidKey && k.key.trim() === invalidKey.trim())) {
      k.status = "invalid";
      k.lastError = errorMsg;
    }
  });
  saveRegisteredKeys(keys);
}

/**
 * Records successful usage of a key to update request counts and timestamps
 */
export function reportKeySuccess(usedKey: string): void {
  const keys = getRegisteredKeys();
  let modified = false;
  keys.forEach((k) => {
    if (k.key === usedKey || (k.key && usedKey && k.key.trim() === usedKey.trim())) {
      k.requestCount = (k.requestCount || 0) + 1;
      k.lastUsed = Date.now();
      if (k.status === "cooldown") {
        k.status = "active";
        k.cooldownUntil = undefined;
      }
      modified = true;
    }
  });
  if (modified) {
    saveRegisteredKeys(keys);
  }
}

export interface KeyValidationResult {
  valid: boolean;
  provider: KeyProvider;
  latencyMs: number;
  message: string;
  quotaStatus: "healthy" | "rate_limited" | "invalid_key" | "network_error";
}

/**
 * Live validation of an API key against its respective provider endpoint
 */
export async function validateApiKey(
  provider: KeyProvider,
  key: string,
  baseUrl?: string,
): Promise<KeyValidationResult> {
  const cleanKey = key.trim();
  if (!cleanKey || cleanKey === "MY_GEMINI_API_KEY") {
    return {
      valid: false,
      provider,
      latencyMs: 0,
      quotaStatus: "invalid_key",
      message: "Key is empty or placeholder.",
    };
  }

  const startTime = performance.now();

  if (provider === "gemini") {
    try {
      const ai = new GoogleGenAI({ apiKey: cleanKey });
      const resp = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: "ping",
      });
      const elapsed = Math.round(performance.now() - startTime);

      if (resp && resp.text !== undefined) {
        return {
          valid: true,
          provider: "gemini",
          latencyMs: elapsed,
          quotaStatus: "healthy",
          message: `Active & Healthy (Latency: ${elapsed}ms)`,
        };
      }
      return {
        valid: false,
        provider: "gemini",
        latencyMs: elapsed,
        quotaStatus: "healthy",
        message: "Empty response received.",
      };
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      const msg = err?.message || String(err);
      if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
        return {
          valid: false,
          provider: "gemini",
          latencyMs: elapsed,
          quotaStatus: "rate_limited",
          message: "Quota Exceeded (HTTP 429). Ready for auto-rotation.",
        };
      }
      if (/400|401|403|API_KEY_INVALID|PERMISSION_DENIED/i.test(msg)) {
        return {
          valid: false,
          provider: "gemini",
          latencyMs: elapsed,
          quotaStatus: "invalid_key",
          message: "Invalid Key or Permission Denied.",
        };
      }
      return {
        valid: false,
        provider: "gemini",
        latencyMs: elapsed,
        quotaStatus: "network_error",
        message: `Network error: ${msg.slice(0, 80)}`,
      };
    }
  }

  if (provider === "groq") {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${cleanKey}` },
      });
      const elapsed = Math.round(performance.now() - startTime);
      if (res.ok) {
        return {
          valid: true,
          provider: "groq",
          latencyMs: elapsed,
          quotaStatus: "healthy",
          message: `Groq Free-Tier Active (${elapsed}ms)`,
        };
      }
      if (res.status === 429) {
        return {
          valid: false,
          provider: "groq",
          latencyMs: elapsed,
          quotaStatus: "rate_limited",
          message: "Groq Rate Limit Reached (429)",
        };
      }
      return {
        valid: false,
        provider: "groq",
        latencyMs: elapsed,
        quotaStatus: "invalid_key",
        message: `Groq Auth Failed (HTTP ${res.status})`,
      };
    } catch (err: any) {
      return {
        valid: false,
        provider: "groq",
        latencyMs: Math.round(performance.now() - startTime),
        quotaStatus: "network_error",
        message: "Failed to connect to Groq endpoint",
      };
    }
  }

  if (provider === "openrouter") {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${cleanKey}` },
      });
      const elapsed = Math.round(performance.now() - startTime);
      if (res.ok) {
        return {
          valid: true,
          provider: "openrouter",
          latencyMs: elapsed,
          quotaStatus: "healthy",
          message: `OpenRouter Key Active (${elapsed}ms)`,
        };
      }
      return {
        valid: false,
        provider: "openrouter",
        latencyMs: elapsed,
        quotaStatus: "invalid_key",
        message: `OpenRouter Key Invalid (HTTP ${res.status})`,
      };
    } catch (err: any) {
      return {
        valid: false,
        provider: "openrouter",
        latencyMs: Math.round(performance.now() - startTime),
        quotaStatus: "network_error",
        message: "Failed to connect to OpenRouter endpoint",
      };
    }
  }

  // Custom Provider
  const targetUrl = baseUrl || "https://api.openai.com/v1/models";
  try {
    const res = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${cleanKey}` },
    });
    const elapsed = Math.round(performance.now() - startTime);
    return {
      valid: res.ok,
      provider: "custom",
      latencyMs: elapsed,
      quotaStatus: res.ok ? "healthy" : "invalid_key",
      message: res.ok ? `Custom Endpoint Active (${elapsed}ms)` : `Status HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      valid: false,
      provider: "custom",
      latencyMs: Math.round(performance.now() - startTime),
      quotaStatus: "network_error",
      message: "Custom endpoint connection error",
    };
  }
}

/**
 * Utility to mask an API key for safe UI display (e.g., AIzaSy...9xAB)
 */
export function maskKey(rawKey: string): string {
  if (!rawKey) return "";
  if (rawKey.length <= 8) return "••••••••";
  return `${rawKey.slice(0, 6)}••••••••${rawKey.slice(-4)}`;
}
