import { scoreResumePipeline } from "@/lib/pipeline/score";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const model = String(form.get("model") || "").trim();
    const openRouterApiKey = String(form.get("openRouterApiKey") || "").trim();
    const githubToken = String(form.get("githubToken") || "").trim() || undefined;
    const githubUrlOverride =
      String(form.get("githubUrlOverride") || "").trim() || undefined;

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
        { error: "Missing OpenRouter API key" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await scoreResumePipeline({
      fileBuffer: buffer,
      fileName: file.name,
      model,
      openRouterApiKey,
      githubToken,
      githubUrlOverride,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
