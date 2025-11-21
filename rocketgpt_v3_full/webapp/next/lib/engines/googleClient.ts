import type { EngineRequest, EngineResponse } from "./types";

/**
 * Mock Google Gemini connector
 */
export async function callGoogle(req: EngineRequest): Promise<EngineResponse> {
  return {
    text: `[Gemini Mock → ${req.model}] Response for: "${req.prompt}"`,
    provider: "google",
    model: req.model,
    latencyMs: Math.floor(Math.random() * 110) + 30,
  };
}
