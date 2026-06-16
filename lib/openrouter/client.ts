import {
  assertCanCallOpenRouter,
  type OpenRouterAuthMode,
  recordOpenRouterProviderRateLimit,
} from "@/lib/rate-limit/openrouter";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterChatRequest = {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  responseFormat?: "json_object";
  authMode?: OpenRouterAuthMode;
  throttleUserId?: string;
};

function cleanJsonText(value: string): string {
  let responseText = value.trim();

  if (responseText.includes("<think>")) {
    const thinkStart = responseText.indexOf("<think>");
    const thinkEnd = responseText.indexOf("</think>");
    if (thinkStart !== -1 && thinkEnd !== -1) {
      responseText =
        responseText.slice(0, thinkStart) + responseText.slice(thinkEnd + 8);
    }
  }

  if (responseText.startsWith("```json")) {
    responseText = responseText.slice(7);
  }
  if (responseText.startsWith("```")) {
    responseText = responseText.slice(3);
  }
  if (responseText.endsWith("```")) {
    responseText = responseText.slice(0, -3);
  }

  return responseText.trim();
}

export function parseJsonFromModelText<T>(raw: string): T {
  const cleaned = cleanJsonText(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(sliced) as T;
    }

    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
      const sliced = cleaned.slice(firstBracket, lastBracket + 1);
      return JSON.parse(sliced) as T;
    }
    throw new Error("Model response did not contain parseable JSON");
  }
}

export async function openRouterChat(
  req: OpenRouterChatRequest,
): Promise<string> {
  const authMode = req.authMode ?? "byok";
  const throttleUserId = req.throttleUserId ?? "anonymous";
  assertCanCallOpenRouter(authMode, throttleUserId);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${req.apiKey}`,
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.1,
      top_p: req.top_p ?? 0.9,
      response_format: req.responseFormat
        ? { type: req.responseFormat }
        : undefined,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      recordOpenRouterProviderRateLimit(authMode);
    }
    const text = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned empty content");
  }
  return content;
}
