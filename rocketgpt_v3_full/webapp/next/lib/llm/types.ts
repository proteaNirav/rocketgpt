export type LLMProviderId = "openai" | "gemini" | "anthropic";

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMRequestBase {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

export interface LLMRouterRequest extends LLMRequestBase {
  provider?: LLMProviderId; // Optional – auto-detected if not provided
}

export interface LLMUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface LLMResponse {
  provider: LLMProviderId;
  model: string;
  output_text: string;
  raw: unknown;
  usage?: LLMUsage;
  finish_reason?: string | null;
}

export class LLMError extends Error {
  public readonly provider?: string;
  public readonly status?: number;
  public readonly causeError?: unknown;

  constructor(message: string, provider?: string, status?: number, cause?: unknown) {
    super(message);
    this.name = "LLMError";
    this.provider = provider;
    this.status = status;
    this.causeError = cause;

    if (cause instanceof Error && cause.stack && !this.stack) {
      this.stack = cause.stack;
    }
  }
}

export interface LLMRetryOptions {
  retries?: number; // default 2 (total attempts = retries + 1)
  delayMs?: number; // base delay between retries
}
