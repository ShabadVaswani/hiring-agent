import { getGithubSession } from "@/lib/auth/github-session";
import { scoreResumePipeline } from "@/lib/pipeline/score";
import {
  getSharedCooldownStatus,
  SHARED_FREE_MODELS,
  OpenRouterThrottleError,
  type OpenRouterAuthMode,
} from "@/lib/rate-limit/openrouter";
import { githubDataSchema, type GitHubData } from "@/lib/schemas/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

function getOrSetAnonymousId(request: Request): {
  anonymousId: string;
  shouldSetCookie: boolean;
} {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)ha_anon=([^;]+)/);
  if (match?.[1]) {
    return { anonymousId: match[1], shouldSetCookie: false };
  }
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return { anonymousId: `anon_${random}`, shouldSetCookie: true };
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const model = String(form.get("model") || "").trim();
    const openRouterApiKey = String(form.get("openRouterApiKey") || "").trim();
    const githubDataJson =
      String(form.get("githubDataJson") || "").trim() || undefined;
    const githubUrlOverride =
      String(form.get("githubUrlOverride") || "").trim() || undefined;

    const githubSession = await getGithubSession().catch(() => null);
    const githubToken = githubSession?.accessToken;
    let githubDataOverride: GitHubData | null = null;
    if (githubDataJson) {
      try {
        const parsed = JSON.parse(githubDataJson);
        githubDataOverride = githubDataSchema.parse(parsed);
      } catch {
        return NextResponse.json(
          { error: "Invalid GitHub enrichment payload" },
          { status: 400 },
        );
      }
    }

    const { anonymousId, shouldSetCookie } = getOrSetAnonymousId(req);

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file upload" },
        { status: 400 },
      );
    }
    if (!model) {
      return NextResponse.json({ error: "Missing model" }, { status: 400 });
    }
    if (!openRouterApiKey) {
      return NextResponse.json(
        {
          error: "Shared model mode is coming soon. Please provide an OpenRouter API key.",
        },
        { status: 400 },
      );
    }

    const authMode: OpenRouterAuthMode = githubToken ? "byokWithGithub" : "byok";
    const throttleUserId = githubSession?.login || anonymousId;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await scoreResumePipeline({
      fileBuffer: buffer,
      fileName: file.name,
      model,
      openRouterApiKey,
      githubToken,
      githubUrlOverride,
      githubDataOverride,
      authMode,
      throttleUserId,
    });

    const response = NextResponse.json({
      ok: true,
      result,
    });
    if (shouldSetCookie) {
      response.cookies.set("ha_anon", anonymousId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (error) {
    if (error instanceof OpenRouterThrottleError) {
      const sharedStatus = getSharedCooldownStatus();
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryAfterSec: Math.ceil(error.retryAfterMs / 1000),
          sharedCooldownSec: sharedStatus.retryAfterSec,
        },
        { status: 429 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const status = getSharedCooldownStatus();
  return NextResponse.json({
    sharedAvailable: false,
    sharedModels: SHARED_FREE_MODELS,
    sharedCooldownActive: status.active,
    sharedCooldownSec: status.retryAfterSec,
  });
}
