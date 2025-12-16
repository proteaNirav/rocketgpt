export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { writeDecision } from "@/lib/ledger/decision-ledger";

const INTERNAL_KEY = process.env.RGPT_INTERNAL_KEY;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Simple internal guard (aligns with orchestrator internal usage)
    const key = req.headers.get("x-rgpt-internal-key");
    if (INTERNAL_KEY && key !== INTERNAL_KEY) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await req.json();

    // Minimal validation
    if (!payload?.runId || !payload?.phase || !payload?.decisionType || !payload?.summary) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: runId, phase, decisionType, summary" },
        { status: 400 }
      );
    }

    const ledgerId = writeDecision(payload);

    return NextResponse.json({ success: true, ledgerId });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message ?? "Ledger write failed" },
      { status: 500 }
    );
  }
}
