import {
  LLMRouterRequest,
  LLMResponse,
  LLMProviderId,
  LLMError,
  LLMRetryOptions,
} from "./types";
import { callOpenAI } from "./providers/openai";
import { callGemini } from "./providers/gemini";
import { callAnthropic } from "./providers/anthropic";

function detectProvider(model: string): LLMProviderId {
  const m = model.toLowerCase();

  if (m.startsWith("gpt-") || m.includes("4.1") || m.includes("4o")) {
    return "openai";
  }

  if (m.includes("gemini")) {
    return "gemini";
  }

  if (m.includes("claude")) {
    return "anthropic";
  }

  return "openai";
}

async function withRetries<T>(
  fn: (attempt: number) => Promise<T>,
  options?: LLMRetryOptions
): Promise<T> {
  const retries = options?.retries ?? 2;
  const delayMs = options?.delayMs ?? 500;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const isLLMError = err instanceof LLMError;
      const status = isLLMError ? err.status : undefined;

      if (status && status >= 400 && status < 500) {
        throw err;
      }

      if (attempt === retries) {
        throw err;
      }

      const backoff = delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, backoff));
      attempt += 1;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new LLMError("Unknown error in withRetries");
}

export async function callLLM(
  req: LLMRouterRequest,
  retryOptions?: LLMRetryOptions & { signal?: AbortSignal }
): Promise<LLMResponse> {
  const provider: LLMProviderId = req.provider ?? detectProvider(req.model);

  return withRetries<LLMResponse>(
    async () => {
      switch (provider) {
        case "openai":
          return await callOpenAI(req, { signal: retryOptions?.signal });

        case "gemini":
          return await callGemini(req, { signal: retryOptions?.signal });

        case "anthropic":
          return await callAnthropic(req, { signal: retryOptions?.signal });

        default:
          throw new LLMError(`Unsupported provider: ${provider}`, provider);
      }
    },
    retryOptions
  );
}
