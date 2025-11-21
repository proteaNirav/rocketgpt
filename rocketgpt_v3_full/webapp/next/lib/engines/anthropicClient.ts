import type { EngineRequest, EngineResponse } from "./types";

/**
 * Mock Anthropic connector (Claude)
 */
export async function callAnthropic(req: EngineRequest): Promise<EngineResponse> {
  return {
    text: `[Claude Mock → ${req.model}] Response for: "${req.prompt}"`,
    provider: "anthropic",
    model: req.model,
    latencyMs: Math.floor(Math.random() * 150) + 60,
  };
}
