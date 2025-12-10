export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// app/api/approvals/update-status/route.ts
// -----------------------------------------------------------------------------
// RocketGPT V9 – Approval Orchestration Hub (AOH)
// API: POST /api/approvals/update-status
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { updateApprovalStatus } from "@/lib/approvals-db";
import type { UpdateApprovalStatusInput } from "@/lib/approvals";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UpdateApprovalStatusInput;

    if (!body.approvalId || !body.status || !body.reviewer) {
      return NextResponse.json(
        {
          success: false,
          error: "approvalId, status, and reviewer are required.",
        },
        { status: 400 }
      );
    }

    if (body.status !== "approved" && body.status !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          error: "status must be 'approved' or 'rejected'.",
        },
        { status: 400 }
      );
    }

    const result = await updateApprovalStatus(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error ?? "Unknown error updating approval.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      approval: result.approval,
    });
  } catch (err: any) {
    console.error("[POST /api/approvals/update-status] Unexpected error:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? "Unexpected server error",
      },
      { status: 500 }
    );
  }
}

