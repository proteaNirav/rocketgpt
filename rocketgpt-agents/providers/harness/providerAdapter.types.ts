// rocketgpt-agents/providers/harness/providerAdapter.types.ts

export type HarnessPromptPayload = {
  id: string;                  // test id (e.g., P3-BASIC-01)
  system?: string;             // optional system prompt
  user: string;                // user prompt text
  max_tokens: number;          // output token cap
  temperature?: number;        // keep default low for determinism
  seed?: number;               // if provider supports; else ignore
};

export type HarnessInvokeResult = {
  text: string;

  // normalized metrics
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;

  // raw provider response for audit/debug
  raw: unknown;
};

export type ProviderAdapter = {
  name: string;   // "openai" | "claude" | "gemini" | etc.
  model: string;  // resolved model name actually used

  invoke(input: HarnessPromptPayload): Promise<HarnessInvokeResult>;
};
