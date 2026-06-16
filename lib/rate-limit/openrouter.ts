export const SHARED_FREE_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
] as const;

export type SharedFreeModel = (typeof SHARED_FREE_MODELS)[number];

export type OpenRouterAuthMode = "shared" | "byok" | "byokWithGithub";

type WindowCounter = {
  timestamps: number[];
};

const ONE_MINUTE_MS = 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

const SHARED_LIMIT_PER_MINUTE = 5;
const BYOK_WITH_GITHUB_LIMIT_PER_MINUTE = 25;
const SHARED_RATE_LIMIT_FAIL_THRESHOLD = 3;

const perUserCounters = new Map<string, WindowCounter>();
const sharedRateLimitFailures: number[] = [];

let sharedCooldownUntil = 0;

export class OpenRouterThrottleError extends Error {
  code:
    | "shared_cooldown"
    | "shared_rate_limited"
    | "byok_github_rate_limited";
  retryAfterMs: number;

  constructor(
    code:
      | "shared_cooldown"
      | "shared_rate_limited"
      | "byok_github_rate_limited",
    message: string,
    retryAfterMs: number,
  ) {
    super(message);
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

function nowMs() {
  return Date.now();
}

function gcCounter(counter: WindowCounter, windowMs: number): WindowCounter {
  const cutoff = nowMs() - windowMs;
  counter.timestamps = counter.timestamps.filter((ts) => ts > cutoff);
  return counter;
}

function getOrCreateCounter(key: string): WindowCounter {
  const existing = perUserCounters.get(key);
  if (existing) return existing;
  const fresh = { timestamps: [] };
  perUserCounters.set(key, fresh);
  return fresh;
}

export function isSharedModel(model: string): model is SharedFreeModel {
  return SHARED_FREE_MODELS.includes(model as SharedFreeModel);
}

export function getSharedCooldownStatus() {
  const now = nowMs();
  const active = sharedCooldownUntil > now;
  return {
    active,
    retryAfterMs: active ? sharedCooldownUntil - now : 0,
    retryAfterSec: active ? Math.ceil((sharedCooldownUntil - now) / 1000) : 0,
  };
}

function enforceSharedCooldown() {
  const { active, retryAfterMs } = getSharedCooldownStatus();
  if (active) {
    throw new OpenRouterThrottleError(
      "shared_cooldown",
      "Shared free models are temporarily paused due to provider throttling. Try again shortly.",
      retryAfterMs,
    );
  }
}

export function assertCanCallOpenRouter(
  mode: OpenRouterAuthMode,
  userId: string,
): void {
  if (mode === "shared") {
    enforceSharedCooldown();
  }

  if (mode === "byok") {
    return;
  }

  const key = `${mode}:${userId}`;
  const counter = gcCounter(getOrCreateCounter(key), ONE_MINUTE_MS);
  const limit =
    mode === "shared" ? SHARED_LIMIT_PER_MINUTE : BYOK_WITH_GITHUB_LIMIT_PER_MINUTE;

  if (counter.timestamps.length >= limit) {
    const oldest = counter.timestamps[0];
    const retryAfterMs = Math.max(1, ONE_MINUTE_MS - (nowMs() - oldest));
    const code =
      mode === "shared" ? "shared_rate_limited" : "byok_github_rate_limited";
    throw new OpenRouterThrottleError(
      code,
      mode === "shared"
        ? "Shared free model limit reached (5 OpenRouter calls/min). Please wait and retry."
        : "OpenRouter limit reached (25 calls/min) for BYOK + GitHub OAuth. Please wait and retry.",
      retryAfterMs,
    );
  }

  counter.timestamps.push(nowMs());
}

export function recordOpenRouterProviderRateLimit(mode: OpenRouterAuthMode): void {
  if (mode !== "shared") return;

  const cutoff = nowMs() - TEN_MINUTES_MS;
  while (sharedRateLimitFailures.length > 0 && sharedRateLimitFailures[0] <= cutoff) {
    sharedRateLimitFailures.shift();
  }
  sharedRateLimitFailures.push(nowMs());

  if (sharedRateLimitFailures.length >= SHARED_RATE_LIMIT_FAIL_THRESHOLD) {
    sharedCooldownUntil = nowMs() + TEN_MINUTES_MS;
    sharedRateLimitFailures.length = 0;
  }
}
