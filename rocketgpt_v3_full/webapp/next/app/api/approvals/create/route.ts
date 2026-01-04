export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// app/api/approvals/create/route.ts
// -----------------------------------------------------------------------------
// RocketGPT V9 â€“ Approval Orchestration Hub (AOH)
// API: POST /api/approvals/create
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { createApproval } from "@/lib/approvals-db";
import type { CreateApprovalInput } from "@/lib/approvals";

export async function POST(req: Request) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  try {
    const body = (await req.json()) as CreateApprovalInput;

    // Basic validation
    if (!body.request_type || !body.request_title) {
      return NextResponse.json(
        {
          success: false,
          error: "request_type and request_title are required.",
        },
        { status: 400 }
      );
    }

    const result = await createApproval(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Unknown error creating approval.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      approval: result.approval,
    });
  } catch (err: any) {
    console.error("[POST /api/approvals/create] Unexpected error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unexpected server error",
      },
      { status: 500 }
    );
  }
}

