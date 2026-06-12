import { getGithubSession } from "@/lib/auth/github-session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getGithubSession();
    if (!session) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      login: session.login,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
