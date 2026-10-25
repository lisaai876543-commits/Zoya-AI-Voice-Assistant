import { GoogleGenAI } from "@google/genai";

const SECURE_VAULT_KEY = "_zoya_sec_vault_v1";
const SALT = "zoya_ai_applet_2026";

/**
 * Lightweight client-side obfuscation to avoid raw plaintext leakage in DevTools/LocalStorage
 */
function xorTransform(input: string, salt: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(input.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  }
  return result;
}

export function saveSecureApiKey(rawKey: string): void {
  if (typeof window === "undefined") return;
  const trimmed = rawKey.trim();
  if (!trimmed) {
    clearSecureApiKey();
    return;
  }
  try {
    const xorred = xorTransform(trimmed, SALT);
    const encoded = btoa(encodeURIComponent(xorred));
    localStorage.setItem(SECURE_VAULT_KEY, encoded);
  } catch (e) {
    console.warn("Secure vault write warning:", e);
    localStorage.setItem(SECURE_VAULT_KEY, trimmed);
  }
}

export function getSecureApiKey(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(SECURE_VAULT_KEY);
  if (!stored) {
    // Check fallback from legacy config
    try {
      const legacyCfg = localStorage.getItem("zoya_app_config");
      if (legacyCfg) {
        const parsed = JSON.parse(legacyCfg);
        if (parsed.apiKey && parsed.apiKey !== "MY_GEMINI_API_KEY") {
          saveSecureApiKey(parsed.apiKey);
          return parsed.apiKey;
        }
      }
    } catch {}
    return "";
  }

  try {
    const decoded = decodeURIComponent(atob(stored));
    const raw = xorTransform(decoded, SALT);
    return raw;
  } catch {
    // If not encoded with current salt, fallback to raw stored
    return stored;
  }
}

export function clearSecureApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SECURE_VAULT_KEY);
  try {
    const legacyCfg = localStorage.getItem("zoya_app_config");
    if (legacyCfg) {
      const parsed = JSON.parse(legacyCfg);
      parsed.apiKey = "";
      localStorage.setItem("zoya_app_config", JSON.stringify(parsed));
    }
  } catch {}
}

export interface ApiKeyTestResult {
  valid: boolean;
  model: string;
  latencyMs: number;
  quotaStatus: "healthy" | "rate_limited" | "invalid_key" | "network_error";
  message: string;
}

/**
 * Validates the Gemini API key against live endpoints and benchmarks latency
 */
export async function testApiKeyAndQuota(apiKey: string): Promise<ApiKeyTestResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey || cleanKey === "MY_GEMINI_API_KEY") {
    return {
      valid: false,
      model: "None",
      latencyMs: 0,
      quotaStatus: "invalid_key",
      message: "API key is missing or set to placeholder.",
    };
  }

  const startTime = performance.now();
  try {
    const ai = new GoogleGenAI({ apiKey: cleanKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: "ping",
    });

    const elapsed = Math.round(performance.now() - startTime);

    if (response && response.text !== undefined) {
      return {
        valid: true,
        model: "gemini-3.1-flash-lite-preview",
        latencyMs: elapsed,
        quotaStatus: "healthy",
        message: `API Key is active & healthy! Round-trip latency: ${elapsed}ms`,
      };
    }

    return {
      valid: false,
      model: "gemini-3.1-flash-lite-preview",
      latencyMs: elapsed,
      quotaStatus: "healthy",
      message: "Received empty response from Gemini.",
    };
  } catch (err: any) {
    const elapsed = Math.round(performance.now() - startTime);
    const msg = err?.message || String(err);

    if (/quota|429|RESOURCE_EXHAUSTED/i.test(msg)) {
      return {
        valid: false,
        model: "gemini-3.1-flash-lite-preview",
        latencyMs: elapsed,
        quotaStatus: "rate_limited",
        message: "Gemini Quota Exceeded (HTTP 429). Please verify billing or wait a moment.",
      };
    }

    if (/API_KEY_INVALID|400|401|403|PERMISSION_DENIED/i.test(msg)) {
      return {
        valid: false,
        model: "gemini-3.1-flash-lite-preview",
        latencyMs: elapsed,
        quotaStatus: "invalid_key",
        message: "Invalid API Key or permission denied for this project.",
      };
    }

    return {
      valid: false,
      model: "gemini-3.1-flash-lite-preview",
      latencyMs: elapsed,
      quotaStatus: "network_error",
      message: `Connection failed: ${msg}`,
    };
  }
}
