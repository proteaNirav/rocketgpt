import { NextRequest, NextResponse } from "next/server";
import { handleChat } from "@/lib/orchestrator/handler";
import type { ChatRequestBody } from "@/lib/orchestrator/types";

/**
 * Thin HTTP wrapper for RocketGPT Chat Orchestrator.
 * Business logic lives in lib/orchestrator/handler.ts
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody | null;

    if (!body || typeof body.message !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing `message`" },
        { status: 400 }
      );
    }

    const trimmed = body.message.trim();
    if (!trimmed) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    // Normalise message before passing into orchestrator
    const safeBody: ChatRequestBody = {
      ...body,
      message: trimmed,
    };

    const result = await handleChat(safeBody);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal error in /api/chat" },
      { status: 500 }
    );
  }
}
