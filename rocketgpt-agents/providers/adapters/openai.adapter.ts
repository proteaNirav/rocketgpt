// rocketgpt-agents/providers/adapters/openai.adapter.ts

import OpenAI from "openai";
import { performance } from "node:perf_hooks";

import type {
  HarnessInvokeResult,
  HarnessPromptPayload,
  ProviderAdapter,
} from "../harness/providerAdapter.types";

function num(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

const defaultModel = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

const adapter: ProviderAdapter = {
  name: "openai",
  model: defaultModel,

  async invoke(input: HarnessPromptPayload): Promise<HarnessInvokeResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("Unauthorized: OPENAI_API_KEY is missing");
    }

    const client = new OpenAI({ apiKey });

    const start = performance.now();

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (input.system && input.system.trim()) {
      messages.push({ role: "system", content: input.system.trim() });
    }
    messages.push({ role: "user", content: input.user });

    // NOTE: using Chat Completions for compatibility with existing codebases.
    const resp = await client.chat.completions.create({
      model: defaultModel,
      messages,
      max_tokens: input.max_tokens,
      temperature: input.temperature ?? 0.2,
    });

    const end = performance.now();

    const text = (resp.choices?.[0]?.message?.content || "").toString();

    // usage fields differ by API/version; guard with fallbacks
    const usage: any = (resp as any).usage || {};
    const tokens_in = num(usage.prompt_tokens);
    const tokens_out = num(usage.completion_tokens);

    return {
      text,
      tokens_in,
      tokens_out,
      latency_ms: Math.max(0, Math.round(end - start)),
      raw: resp,
    };
  },
};

export default adapter;
