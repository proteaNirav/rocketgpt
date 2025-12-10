import { LLMRequestBase, LLMResponse, LLMError } from "../types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function getOpenAIApiKey(): string {
  const key = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    throw new LLMError("Missing OPENAI_API_KEY environment variable", "openai");
  }
  return key;
}

export async function callOpenAI(
  req: LLMRequestBase,
  options?: { signal?: AbortSignal }
): Promise<LLMResponse> {
  const apiKey = getOpenAIApiKey();

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  if (typeof req.temperature === "number") body.temperature = req.temperature;
  if (typeof req.max_tokens === "number") body.max_tokens = req.max_tokens;
  if (typeof req.top_p === "number") body.top_p = req.top_p;
  if (typeof req.presence_penalty === "number") body.presence_penalty = req.presence_penalty;
  if (typeof req.frequency_penalty === "number") body.frequency_penalty = req.frequency_penalty;

  let res: Response;

  try {
    res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options?.signal ?? undefined,
    });
  } catch (err) {
    throw new LLMError("Network error calling OpenAI", "openai", undefined, err);
  }

  const status = res.status;
  const json = await res.json().catch((err) => {
    throw new LLMError("Failed to parse OpenAI response JSON", "openai", status, err);
  });

  if (!res.ok) {
    const msg =
      (json && (json.error?.message || json.error?.code || json.error)) ||
      `OpenAI API error (status ${status})`;
    throw new LLMError(msg, "openai", status, json);
  }

  const choice = json.choices?.[0];
  const outputText: string = choice?.message?.content ?? "";

  const usage = json.usage
    ? {
        prompt_tokens: json.usage.prompt_tokens,
        completion_tokens: json.usage.completion_tokens,
        total_tokens: json.usage.total_tokens,
      }
    : undefined;

  const resp: LLMResponse = {
    provider: "openai",
    model: json.model || req.model,
    output_text: outputText,
    raw: json,
    usage,
    finish_reason: choice?.finish_reason ?? null,
  };

  return resp;
}
