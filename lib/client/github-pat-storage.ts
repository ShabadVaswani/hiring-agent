const STORAGE_KEY = "github_pat";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type StoredPat = {
  value: string;
  expiresAt: number;
};

export function loadStoredGithubPat(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredPat;
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

export function saveGithubPat(value: string): void {
  if (typeof window === "undefined") return;

  const trimmed = value.trim();
  if (!trimmed) {
    clearStoredGithubPat();
    return;
  }

  const payload: StoredPat = {
    value: trimmed,
    expiresAt: Date.now() + TTL_MS,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearStoredGithubPat(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export const GITHUB_PAT_TTL_DAYS = 30;
