import { LLMRequestBase, LLMResponse, LLMError } from "../types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new LLMError("Missing GEMINI_API_KEY / GOOGLE_API_KEY environment variable", "gemini");
  }
  return key;
}

function mapMessagesToGeminiContents(messages: LLMRequestBase["messages"]) {
  return messages.map((m) => ({
    role: m.role === "system" ? "user" : m.role,
    parts: [{ text: m.content }],
  }));
}

export async function callGemini(
  req: LLMRequestBase,
  options?: { signal?: AbortSignal }
): Promise<LLMResponse> {
  const apiKey = getGeminiApiKey();

  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(
    req.model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const generationConfig: Record<string, unknown> = {};
  if (typeof req.temperature === "number") generationConfig.temperature = req.temperature;
  if (typeof req.max_tokens === "number") generationConfig.maxOutputTokens = req.max_tokens;
  if (typeof req.top_p === "number") generationConfig.topP = req.top_p;

  const body: Record<string, unknown> = {
    contents: mapMessagesToGeminiContents(req.messages),
    generationConfig,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options?.signal ?? undefined,
    });
  } catch (err) {
    throw new LLMError("Network error calling Gemini", "gemini", undefined, err);
  }

  const status = res.status;
  const json = await res.json().catch((err) => {
    throw new LLMError("Failed to parse Gemini response JSON", "gemini", status, err);
  });

  if (!res.ok) {
    const msg =
      json.error?.message ||
      json.error?.status ||
      `Gemini API error (status ${status})`;
    throw new LLMError(msg, "gemini", status, json);
  }

  const candidates = json.candidates || [];
  const first = candidates[0];

  let outputText = "";
  if (first?.content?.parts?.length) {
    outputText = first.content.parts
      .map((p: { text?: string }) => p.text || "")
      .join("");
  }

  const usage = json.usageMetadata
    ? {
        prompt_tokens: json.usageMetadata.promptTokenCount,
        completion_tokens: json.usageMetadata.candidatesTokenCount,
        total_tokens: json.usageMetadata.totalTokenCount,
      }
    : undefined;

  const resp: LLMResponse = {
    provider: "gemini",
    model: req.model,
    output_text: outputText,
    raw: json,
    usage,
    finish_reason: first?.finishReason ?? null,
  };

  return resp;
}
