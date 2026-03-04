import { NextRequest, NextResponse } from "next/server";

import { listCrpsExecutions } from "@/lib/db/governanceRepo";
import { isPrivilegedRead } from "@/lib/governance/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function toIso(value: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function redactForOperator(rows: any[]): any[] {
  return rows.map((row) => ({
    id: row.id,
    run_id: row.run_id,
    workflow_id: row.workflow_id,
    crps_id: row.crps_id,
    impact_score: row.impact_score,
    reversibility_score: row.reversibility_score,
    aggressiveness_score: row.aggressiveness_score,
    confidence: row.confidence,
    recommended_level: row.recommended_level,
    risk_domains: row.risk_domains,
    created_at: row.created_at,
    explanation: "Detailed CRPS fields are restricted to admin/auditor roles.",
  }));
}

export async function GET(req: NextRequest) {
  try {
    const from = toIso(req.nextUrl.searchParams.get("from"));
    const to = toIso(req.nextUrl.searchParams.get("to"));
    const rows = await listCrpsExecutions(from, to);
    const data = isPrivilegedRead(req) ? rows : redactForOperator(rows);
    return NextResponse.json({ items: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch CRPS records.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

