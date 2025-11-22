import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const messages = (body as any)?.messages as ChatMessage[] | undefined;

    const safeMessages: ChatMessage[] = Array.isArray(messages)
      ? messages.map((m) => ({
          role:
            m.role === "assistant" || m.role === "system" ? m.role : "user",
          content: String(m.content ?? "")
        }))
      : [];

    const openaiMessages = [
      {
        role: "system" as const,
        content:
          "You are RocketGPT, an AI Orchestrator assistant. Be concise, helpful, and safe. You are running in a demo environment wired through Next.js."
      },
      ...safeMessages
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: openaiMessages,
        max_tokens: 512,
        temperature: 0.4
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI error:", response.status, text);
      return NextResponse.json(
        { error: "Orchestrator model call failed." },
        { status: 500 }
      );
    }

    const json = (await response.json()) as any;
    const reply =
      json?.choices?.[0]?.message?.content ??
      "RocketGPT demo orchestrator could not generate a reply.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Error in /api/demo/chat:", err);
    return NextResponse.json(
      { error: "Internal error in /api/demo/chat" },
      { status: 500 }
    );
  }
}
