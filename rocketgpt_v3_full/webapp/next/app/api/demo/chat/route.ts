import { NextRequest, NextResponse } from "next/server";
import { completeChatWithFallback, type LLMMessage } from "../../_lib/llmProvider";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = (body as any)?.messages as ChatMessage[] | undefined;

    const safeMessages: ChatMessage[] = Array.isArray(messages)
      ? messages.map((m) => ({
          role:
            m.role === "assistant" || m.role === "system" ? m.role : "user",
          content: String(m.content ?? ""),
        }))
      : [];

    const systemMessage: ChatMessage = {
      role: "system",
      content:
        "You are RocketGPT, an AI Orchestrator assistant. Be concise, helpful, and safe. You are running in a demo environment wired through Next.js.",
    };

    const providerMessages: LLMMessage[] = [systemMessage, ...safeMessages].map(
      (m) => ({
        role: m.role,
        content: m.content,
      })
    );

    const reply = await completeChatWithFallback(providerMessages);

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Error in /api/demo/chat:", err);
    const message =
      err && typeof err.message === "string"
        ? err.message
        : "Internal error in /api/demo/chat";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
