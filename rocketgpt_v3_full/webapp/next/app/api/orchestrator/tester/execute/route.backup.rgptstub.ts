import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// --------------------------------------------------
// Supabase Admin Client
// --------------------------------------------------
function getSupabaseAdminClient(): SupabaseClient {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client missing. Configure SUPABASE_URL + SERVICE ROLE KEY."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// --------------------------------------------------
// POST /api/orchestrator/tester/execute
// --------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const runId = body?.runId;
    const buildId = body?.buildId;
    const testFiles = body?.testFiles;
    const mode = body?.mode ?? "single";
    const metadata = body?.metadata ?? {};

    if (!runId || typeof runId !== "number") {
      return NextResponse.json(
        { error: "InvalidPayload", message: "runId (number) required." },
        { status: 400 }
      );
    }

    if (!buildId || typeof buildId !== "number") {
      return NextResponse.json(
        { error: "InvalidPayload", message: "buildId (number) required." },
        { status: 400 }
      );
    }

    if (!Array.isArray(testFiles) || testFiles.length === 0) {
      return NextResponse.json(
        { error: "InvalidPayload", message: "testFiles[] is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // -----------------------------------------------------
    // Fetch build record safely
    // -----------------------------------------------------
    const { data: buildRecord, error: buildErr } = await supabase
      .from("rgpt_builds")
      .select("*")
      .eq("id", buildId)
      .maybeSingle();

    if (buildErr) {
      return NextResponse.json(
        {
          error: "TesterFetchBuildError",
          message: buildErr.message,
        },
        { status: 500 }
      );
    }

    if (!buildRecord) {
      return NextResponse.json(
        {
          error: "TesterBuildNotFound",
          message: `No build found for ID ${buildId}.`,
        },
        { status: 404 }
      );
    }

    // -----------------------------------------------------
    // Prepare test payload
    // -----------------------------------------------------
    const testPayload = {
      runId,
      buildId,
      testFiles,
      mode,
      metadata,
    };

    // In the real system this will call the Tester agent
    // For now we simulate execution success.
    const simulatedResult = {
      status: "success",
      executedFiles: testFiles,
      durationMs: Math.floor(Math.random() * 300) + 50,
    };

    // -----------------------------------------------------
    // Return response
    // -----------------------------------------------------
    return NextResponse.json(
      {
        success: true,
        runId,
        buildId,
        tests: simulatedResult,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/orchestrator/tester/execute] ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: "TesterExecuteError",
        message: err?.message ?? "Unexpected tester execution error.",
      },
      { status: 500 }
    );
  }
}
