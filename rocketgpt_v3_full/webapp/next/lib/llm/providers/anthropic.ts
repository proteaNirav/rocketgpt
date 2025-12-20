import { LLMRequestBase, LLMResponse, LLMError } from "../types";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new LLMError("Missing ANTHROPIC_API_KEY environment variable", "anthropic");
  }
  return key;
}

function splitMessagesForAnthropic(messages: LLMRequestBase["messages"]) {
  const systemParts: string[] = [];
  const nonSystem = messages.filter((m) => {
    if (m.role === "system") {
      systemParts.push(m.content);
      return false;
    }
    return true;
  });

  const system = systemParts.length ? systemParts.join("\n\n") : undefined;

  const mappedMessages = nonSystem.map((m) => ({
    role: m.role as "user" | "assistant",
    content: [
      {
        type: "text",
        text: m.content,
      },
    ],
  }));

  return { system, mappedMessages };
}

export async function callAnthropic(
  req: LLMRequestBase,
  options?: { signal?: AbortSignal }
): Promise<LLMResponse> {
  const apiKey = getAnthropicApiKey();
  const { system, mappedMessages } = splitMessagesForAnthropic(req.messages);

  const body: Record<string, unknown> = {
    model: req.model,
    messages: mappedMessages,
    max_tokens: req.max_tokens ?? 1024,
  };

  if (system) body.system = system;
  if (typeof req.temperature === "number") body.temperature = req.temperature;

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options?.signal ?? undefined,
    });
  } catch (err) {
    throw new LLMError("Network error calling Anthropic", "anthropic", undefined, err);
  }

  const status = res.status;
  const json = await res.json().catch((err) => {
    throw new LLMError("Failed to parse Anthropic response JSON", "anthropic", status, err);
  });

  if (!res.ok) {
    const msg =
      json.error?.message ||
      json.error?.type ||
      `Anthropic API error (status ${status})`;
    throw new LLMError(msg, "anthropic", status, json);
  }

  let outputText = "";
  if (Array.isArray(json.content)) {
    outputText = json.content
      .filter((p: any) => p.type === "text" && typeof p.text === "string")
      .map((p: any) => p.text)
      .join("");
  }

  const usage = json.usage
    ? {
        prompt_tokens: json.usage.input_tokens,
        completion_tokens: json.usage.output_tokens,
        total_tokens: (json.usage.input_tokens || 0) + (json.usage.output_tokens || 0),
      }
    : undefined;

  const resp: LLMResponse = {
    provider: "anthropic",
    model: json.model || req.model,
    output_text: outputText,
    raw: json,
    usage,
    finish_reason: json.stop_reason ?? null,
  };

  return resp;
}
