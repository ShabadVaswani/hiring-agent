const STORAGE_KEY = "openrouter_api_key";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredKey = {
  value: string;
  expiresAt: number;
};

export function loadStoredOpenRouterKey(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredKey;
    if (!parsed.value || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.value;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveOpenRouterKey(value: string): void {
  if (typeof window === "undefined") return;

  const trimmed = value.trim();
  if (!trimmed) {
    clearStoredOpenRouterKey();
    return;
  }

  const payload: StoredKey = {
    value: trimmed,
    expiresAt: Date.now() + TTL_MS,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredOpenRouterKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export const OPENROUTER_KEY_TTL_DAYS = 30;
