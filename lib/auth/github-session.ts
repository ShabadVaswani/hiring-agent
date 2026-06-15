import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

export const GITHUB_AUTH_COOKIE = "github_auth";
export const GITHUB_STATE_COOKIE = "github_oauth_state";

export type GithubSession = {
  accessToken: string;
  login: string;
};

function getSecretKey(): Buffer {
  const secret = process.env.GITHUB_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "GITHUB_SESSION_SECRET must be set (at least 16 characters)",
    );
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSession(session: GithubSession): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretKey(), iv);
  const payload = JSON.stringify(session);
  const encrypted = Buffer.concat([
    cipher.update(payload, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptSession(value: string): GithubSession | null {
  try {
    const buffer = Buffer.from(value, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const data = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getSecretKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as GithubSession;
  } catch {
    return null;
  }
}

export async function getGithubSession(): Promise<GithubSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GITHUB_AUTH_COOKIE)?.value;
  if (!raw) return null;
  return decryptSession(raw);
}

export function getBasePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
}

export function getConfiguredAppOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  return configured || null;
}

export function getAppOrigin(request: Request): string {
  const configured = getConfiguredAppOrigin();
  if (configured) return configured;

  // Local dev only — never use VERCEL_URL in production (preview URLs break OAuth).
  const { origin, pathname } = new URL(request.url);
  const basePath = getBasePath();
  if (basePath && pathname.startsWith(basePath)) {
    return `${origin}${basePath}`;
  }
  return `${origin}${basePath}`;
}

export function getOAuthCallbackUrl(request: Request): string {
  return `${getAppOrigin(request)}/api/auth/github/callback`;
}

export function getAppHomeUrl(request: Request): string {
  return `${getAppOrigin(request)}/`;
}

export function createOAuthState(): string {
  return randomBytes(24).toString("base64url");
}
