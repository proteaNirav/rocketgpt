import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = (body as any)?.messages ?? [];
    const reversed = Array.isArray(messages) ? [...messages].reverse() : [];
    const lastUser = reversed.find((m: any) => m?.role === "user");
    const userText = lastUser?.content ?? "Hello from RocketGPT demo.";

    // TODO: Integrate real RocketGPT orchestrator here.
    // For now, this is a safe demo stub that proves wiring is correct.
    const reply =
      `Demo orchestrator response.\n\n` +
      `You said: "${userText}".\n\n` +
      `This confirms that the chat UI, the API route, and the application pipeline are all connected correctly. ` +
      `Later, replace this stub with a call to your real orchestrator (e.g. /api/chat, /api/recommend or your core AI engine).`;

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Error in /api/demo/chat:", err);
    return NextResponse.json(
      { error: "Internal error in /api/demo/chat" },
      { status: 500 }
    );
  }
}
