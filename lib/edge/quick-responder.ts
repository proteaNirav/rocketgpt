import type { NextRequest } from "next/server";

/**
 * quick-responder
 * Minimal production-safe scaffold:
 * - Accepts input via GET (?q=) or POST ({ q: string })
 * - Normalizes/validates input
 * - Returns structured response { reply, tokens, model, meta }
 * NOTE: This is a local stub. In Step 1B we can swap the core with your LLM of choice.
 */
export default async function quickResponder(req: NextRequest) {
  const url = new URL(req.url);

  // Read query/body
  let q = url.searchParams.get("q") ?? "";
  if (!q && req.method !== "GET" && req.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = (await req.json()) as unknown;
      if (body && typeof body === "object" && "q" in (body as any)) {
        q = String((body as any).q ?? "");
      }
    } catch {
      // ignore malformed JSON
    }
  }

  // Basic validation
  const input = q.trim();
  if (!input) {
    return {
      error: { code: "BAD_REQUEST", message: "Missing prompt 'q'." },
    };
  }

  // TODO: integrate real LLM call here (OpenAI/Claude/Groq). For now, a safe heuristic reply:
  const reply = [
    "Thanks for your prompt.",
    "This is the RocketGPT quick-responder stub.",
    `Input preview: "${input.slice(0, 160)}"${input.length > 160 ? "…" : ""}`,
  ].join(" ");

  return {
    reply,
    tokens: { prompt_tokens: Math.min(64, input.length), completion_tokens: 32, total_tokens: Math.min(64, input.length) + 32 },
    model: "stub-edge-v1",
    meta: {
      mode: "edge",
      received_at: Date.now(),
      method: req.method,
    },
  };
}
