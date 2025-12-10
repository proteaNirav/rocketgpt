import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LLMMessage } from "@/lib/llm/types";

import {
  getNextPendingBuilderStep,
  markBuilderStepRunning,
  markBuilderStepSuccess,
  markBuilderStepFailed,
} from "@/lib/orchestrator/builder_executor";

import { callLLM } from "@/lib/llm/router";

export const dynamic = "force-dynamic";

// -----------------------------------------------
// Supabase Admin Client
// -----------------------------------------------
function getSupabaseAdminClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client is not configured. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// -----------------------------------------------
// POST /api/orchestrator/builder/execute-next
// -----------------------------------------------
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const { runId, model } = body as { runId: number; model?: string };

    if (typeof runId !== "number" || !Number.isFinite(runId)) {
      return NextResponse.json(
        { error: "InvalidPayload", message: "runId must be a finite number." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // 1) Fetch next pending builder step
    const nextStep = await getNextPendingBuilderStep(supabase, runId);
    if (!nextStep) {
      return NextResponse.json(
        {
          success: true,
          runId,
          done: true,
          message: "No pending builder steps for this run.",
          step: null,
        },
        { status: 200 }
      );
    }

    // 2) Mark step as running
    const runningStep = await markBuilderStepRunning(supabase, nextStep.id);

    // 3) Prepare LLM request
    const usedModel =
      model ?? process.env.RGPT_BUILDER_MODEL ?? "gpt-4.1-mini";

    const messages: LLMMessage[] = [
      {
        role: "system",
        content:
          "You are the Builder agent for RocketGPT. " +
          "You generate precise, deterministic code modifications and explanations. " +
          "Respond concisely and deterministically.",
      },
      {
        role: "user",
        content: runningStep.instruction,
      },
    ];

    const llmInput = JSON.stringify(
      { model: usedModel, messages },
      null,
      2
    );

    // 4) Call Router-based LLM (OpenAI/Gemini/Claude/etc.)
    let llmOutput = "";
    try {
      const completion = await callLLM({
        model: usedModel,
        messages,
        temperature: 0.2,
      });

      llmOutput = completion.output_text || "";
    } catch (innerErr: any) {
      const failedStep = await markBuilderStepFailed(
        supabase,
        runningStep.id,
        innerErr?.message ?? "LLM call failed.",
        llmInput
      );

      return NextResponse.json(
        {
          error: "BuilderLLMError",
          message: innerErr?.message ?? "LLM call failed.",
          step: failedStep,
        },
        { status: 500 }
      );
    }

    // 5) Mark success
    const succeededStep = await markBuilderStepSuccess(
      supabase,
      runningStep.id,
      llmInput,
      llmOutput
    );

    const durationMs = Date.now() - startedAt;

    return NextResponse.json(
      { success: true, runId, step: succeededStep, durationMs },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(
      "[/api/orchestrator/builder/execute-next] ERROR:",
      err
    );

    return NextResponse.json(
      {
        error: "BuilderExecuteNextError",
        message:
          err?.message ?? "Unknown error executing builder step.",
        stack:
          process.env.NODE_ENV !== "production"
            ? err?.stack ?? null
            : undefined,
      },
      { status: 500 }
    );
  }
}
