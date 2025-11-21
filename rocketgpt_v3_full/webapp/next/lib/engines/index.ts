import type { EngineRequest, EngineResponse } from "./types";
import { callOpenAI } from "./openaiClient";
import { callAnthropic } from "./anthropicClient";
import { callGoogle } from "./googleClient";

export async function callEngine(
  provider: string,
  req: EngineRequest
): Promise<EngineResponse> {
  if (provider === "openai") return callOpenAI(req);
  if (provider === "anthropic") return callAnthropic(req);
  if (provider === "google") return callGoogle(req);

  throw new Error(`Unsupported provider: ${provider}`);
}
