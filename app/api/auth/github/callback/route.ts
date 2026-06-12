import {
  encryptSession,
  GITHUB_AUTH_COOKIE,
  GITHUB_STATE_COOKIE,
  getAppHomeUrl,
  getOAuthCallbackUrl,
} from "@/lib/auth/github-session";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function redirectWithError(request: Request, message: string) {
  const url = new URL(getAppHomeUrl(request));
  url.searchParams.set("github", "error");
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithError(request, "GitHub OAuth is not configured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectWithError(request, "GitHub authorization was cancelled");
  }
  if (!code || !state) {
    return redirectWithError(request, "Missing OAuth callback parameters");
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get(GITHUB_STATE_COOKIE)?.value;
  if (!savedState || savedState !== state) {
    return redirectWithError(request, "Invalid OAuth state");
  }

  const redirectUri = getOAuthCallbackUrl(request);

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    },
  );

  if (!tokenResponse.ok) {
    return redirectWithError(request, "Failed to exchange GitHub OAuth code");
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenPayload.access_token) {
    return redirectWithError(
      request,
      tokenPayload.error_description ||
        tokenPayload.error ||
        "No access token returned",
    );
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
  });

  if (!userResponse.ok) {
    return redirectWithError(request, "Failed to load GitHub profile");
  }

  const user = (await userResponse.json()) as { login?: string };
  if (!user.login) {
    return redirectWithError(request, "GitHub profile is missing a username");
  }

  const home = new URL(getAppHomeUrl(request));
  home.searchParams.set("github", "connected");

  const response = NextResponse.redirect(home);
  response.cookies.set(
    GITHUB_AUTH_COOKIE,
    encryptSession({
      accessToken: tokenPayload.access_token,
      login: user.login,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
  response.cookies.set(GITHUB_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
