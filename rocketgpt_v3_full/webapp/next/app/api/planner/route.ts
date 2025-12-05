// rocketgpt_v3_full/webapp/next/app/api/planner/route.ts
// Planner API endpoint for RocketGPT
// Runtime LLM: OpenAI only

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  PLANNER_SYSTEM_PROMPT,
  buildPlannerUserPrompt,
  PlannerInput,
} from "@/app/api/_lib/plannerPrompt";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_PLANNER_MODEL =
  process.env.RGPT_PLANNER_MODEL ||
  process.env.RGPT_DEFAULT_MODEL ||
  "gpt-4o-mini";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as PlannerInput | null;

    if (!body || !body.goal || !body.goal.trim()) {
      return NextResponse.json(
        { error: "Missing required field: goal" },
        { status: 400 }
      );
    }

    const userPrompt = buildPlannerUserPrompt(body);

    const completion = await openai.chat.completions.create({
      model: DEFAULT_PLANNER_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: PLANNER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const message = completion.choices[0]?.message?.content?.trim() || "";

    if (!message) {
      return NextResponse.json(
        { error: "Planner LLM returned empty content." },
        { status: 502 }
      );
    }

    let plan: unknown;

    try {
      plan = JSON.parse(message);
    } catch (err) {
      // LLM did not return valid JSON; return raw text for debugging
      return NextResponse.json(
        {
          error: "Planner LLM did not return valid JSON.",
          raw: message,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        model: DEFAULT_PLANNER_MODEL,
        plan,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("[PLANNER_API] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Unexpected error while generating plan.",
      },
      { status: 500 }
    );
  }
}
