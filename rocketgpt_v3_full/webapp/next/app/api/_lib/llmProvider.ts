export type LLMRole = "user" | "assistant" | "system";

export type LLMMessage = {
  role: LLMRole;
  content: string;
};

export interface LLMProvider {
  completeChat(messages: LLMMessage[]): Promise<string>;
}

type ProviderKind = "openai" | "gemini";

/**
 * ====== OpenAI model auto-selection (Option C) ======
 */

const OPENAI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OPENAI_MODEL_CANDIDATES = [
  "gpt-4.1-mini",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4o",
];

let openAIModelCache: { model: string; updatedAt: number } | null = null;

async function resolveOpenAIModel(apiKey: string): Promise<string> {
  const override = process.env.ROCKETGPT_CHAT_MODEL;
  if (override && override.trim().length > 0) {
    return override.trim();
  }

  const now = Date.now();
  if (openAIModelCache && now - openAIModelCache.updatedAt < OPENAI_CACHE_TTL_MS) {
    return openAIModelCache.model;
  }

  // Try candidates via /v1/models/{id}
  for (const candidate of OPENAI_MODEL_CANDIDATES) {
    try {
      const resp = await fetch(
        "https://api.openai.com/v1/models/" + encodeURIComponent(candidate),
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + apiKey,
          },
        }
      );
      if (resp.ok) {
        openAIModelCache = { model: candidate, updatedAt: Date.now() };
        return candidate;
      }
    } catch {
      // ignore and try next
    }
  }

  // Fallback if /models lookup fails
  const fallback = "gpt-4.1-mini";
  openAIModelCache = { model: fallback, updatedAt: Date.now() };
  return fallback;
}

/**
 * ====== Gemini model auto-selection (Option C) ======
 */

const GEMINI_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let geminiModelCache: { model: string; updatedAt: number } | null = null;

async function resolveGeminiModel(apiKey: string): Promise<string> {
  const override = process.env.ROCKETGPT_GEMINI_MODEL;
  if (override && override.trim().length > 0) {
    return override.trim();
  }

  const now = Date.now();
  if (geminiModelCache && now - geminiModelCache.updatedAt < GEMINI_CACHE_TTL_MS) {
    return geminiModelCache.model;
  }

  const baseUrlEnv = process.env.GEMINI_API_BASE_URL;
  const baseUrl =
    baseUrlEnv && baseUrlEnv.trim().length > 0
      ? baseUrlEnv
      : "https://generativelanguage.googleapis.com/v1beta";

  const url = baseUrl + "/models?key=" + encodeURIComponent(apiKey);

  let modelId: string | null = null;

  try {
    const response = await fetch(url);
    if (response.ok) {
      const json = (await response.json()) as any;
      const models = json && json.models ? (json.models as any[]) : [];

      const preferred = [
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-1.0-pro",
        "gemini-pro",
      ];

      for (const preferredId of preferred) {
        const found = models.find((m) => {
          const name = m && m.name ? String(m.name) : "";
          return name.indexOf(preferredId) !== -1;
        });
        if (found) {
          modelId = preferredId;
          break;
        }
      }

      if (!modelId && models.length > 0) {
        const first = models[0];
        const name = first && first.name ? String(first.name) : "";
        if (name) {
          const parts = name.split("/");
          modelId = parts[parts.length - 1] ?? null;
        }
      }
    }
  } catch {
    // ignore, will use static fallback
  }

  if (!modelId) {
    modelId = "gemini-1.5-flash-latest";
  }

  geminiModelCache = { model: modelId, updatedAt: Date.now() };
  return modelId;
}

/**
 * ====== OpenAI provider ======
 */
class OpenAIChatProvider implements LLMProvider {
  private apiKey: string;
  private model: string | null;

  constructor(apiKey: string, model: string | null) {
    this.apiKey = apiKey;
    this.model = model && model.trim().length > 0 ? model.trim() : null;
  }

  async completeChat(messages: LLMMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured for the LLM provider.");
    }

    let modelToUse = this.model;
    if (!modelToUse) {
      modelToUse = await resolveOpenAIModel(this.apiKey);
      this.model = modelToUse;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        max_tokens: 512,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      let text = "";
      try {
        text = await response.text();
      } catch {
        // ignore
      }

      const statusText = "status " + response.status.toString();
      let message = "Orchestrator model call failed (" + statusText + ")";
      if (text) {
        message = message + ": " + text;
      }
      throw new Error(message);
    }

    const json = (await response.json()) as any;
    const reply =
      json &&
      json.choices &&
      json.choices[0] &&
      json.choices[0].message &&
      json.choices[0].message.content
        ? json.choices[0].message.content
        : null;

    if (!reply || typeof reply !== "string") {
      throw new Error("Model returned an empty or invalid reply.");
    }

    return reply;
  }
}

/**
 * ====== Gemini provider ======
 */
class GeminiChatProvider implements LLMProvider {
  private apiKey: string;
  private model: string | null;

  constructor(apiKey: string, model: string | null) {
    this.apiKey = apiKey;
    this.model = model && model.trim().length > 0 ? model.trim() : null;
  }

  async completeChat(messages: LLMMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured for the LLM provider.");
    }

    let modelToUse = this.model;
    if (!modelToUse) {
      modelToUse = await resolveGeminiModel(this.apiKey);
      this.model = modelToUse;
    }

    const baseUrlEnv = process.env.GEMINI_API_BASE_URL;
    const baseUrl =
      baseUrlEnv && baseUrlEnv.trim().length > 0
        ? baseUrlEnv
        : "https://generativelanguage.googleapis.com/v1beta";

    const url =
      baseUrl +
      "/models/" +
      encodeURIComponent(modelToUse) +
      ":generateContent?key=" +
      encodeURIComponent(this.apiKey);

    const textParts = messages
      .map((m) => "[" + m.role.toUpperCase() + "] " + m.content)
      .join("\n\n");

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: textParts }],
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let text = "";
      try {
        text = await response.text();
      } catch {
        // ignore
      }

      const statusText = "status " + response.status.toString();
      let message = "Gemini model call failed (" + statusText + ")";
      if (text) {
        message = message + ": " + text;
      }
      throw new Error(message);
    }

    const json = (await response.json()) as any;
    let reply: any = null;

    if (
      json &&
      json.candidates &&
      json.candidates[0] &&
      json.candidates[0].content &&
      json.candidates[0].content.parts &&
      json.candidates[0].content.parts[0]
    ) {
      reply = json.candidates[0].content.parts[0].text;
    }

    if (!reply || typeof reply !== "string") {
      throw new Error("Gemini returned an empty or invalid reply.");
    }

    return reply;
  }
}

/**
 * Provider mode and factory
 */

function getProviderMode(): "openai" | "gemini" | "auto" {
  const env = process.env.ROCKETGPT_PROVIDER;
  if (!env) return "auto";
  const v = env.toLowerCase();
  if (v === "openai") return "openai";
  if (v === "gemini") return "gemini";
  return "auto";
}

function createProvider(kind: ProviderKind): LLMProvider {
  if (kind === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY || "";
    // null forces auto-selection; env override is handled inside resolver
    return new GeminiChatProvider(apiKey, null);
  } else {
    const apiKey = process.env.OPENAI_API_KEY || "";
    return new OpenAIChatProvider(apiKey, null);
  }
}

/**
 * Detect if an error from OpenAI looks like a quota / 429 issue.
 */
function isOpenAIQuotaError(err: unknown): boolean {
  if (!err || typeof (err as any).message !== "string") return false;
  const msg = (err as any).message.toLowerCase();
  if (msg.indexOf("429") !== -1) return true;
  if (msg.indexOf("insufficient_quota") !== -1) return true;
  if (msg.indexOf("you exceeded your current quota") !== -1) return true;
  return false;
}

/**
 * completeChatWithFallback
 * ------------------------
 * - Mode "openai": use OpenAI only.
 * - Mode "gemini": use Gemini only.
 * - Mode "auto" (default):
 *     * Try OpenAI.
 *     * If we detect quota/429 error → fallback to Gemini.
 */
export async function completeChatWithFallback(
  messages: LLMMessage[]
): Promise<string> {
  const mode = getProviderMode();

  if (mode === "gemini") {
    const gemini = createProvider("gemini");
    return gemini.completeChat(messages);
  }

  if (mode === "openai") {
    const openai = createProvider("openai");
    return openai.completeChat(messages);
  }

  // auto mode: OpenAI primary, Gemini fallback on quota error
  const openaiProvider = createProvider("openai");
  try {
    return await openaiProvider.completeChat(messages);
  } catch (err) {
    if (!isOpenAIQuotaError(err)) {
      throw err;
    }

    const geminiProvider = createProvider("gemini");
    return await geminiProvider.completeChat(messages);
  }
}
