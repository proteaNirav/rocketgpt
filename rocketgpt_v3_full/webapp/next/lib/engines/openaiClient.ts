import type { EngineRequest, EngineResponse } from "./types";

/**
 * Mock OpenAI connector (production-ready structure)
 */
export async function callOpenAI(req: EngineRequest): Promise<EngineResponse> {
  return {
    text: `[OpenAI Mock → ${req.model}] Response for: "${req.prompt}"`,
    provider: "openai",
    model: req.model,
    latencyMs: Math.floor(Math.random() * 120) + 40,
  };
}
