import { NextRequest, NextResponse } from "next/server";

import { listContainmentEvents } from "@/lib/db/governanceRepo";
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
    containment_level: row.containment_level,
    explanation: row.explanation,
    created_at: row.created_at,
  }));
}

export async function GET(req: NextRequest) {
  try {
    const from = toIso(req.nextUrl.searchParams.get("from"));
    const to = toIso(req.nextUrl.searchParams.get("to"));
    const rows = await listContainmentEvents(from, to);
    const data = isPrivilegedRead(req) ? rows : redactForOperator(rows);
    return NextResponse.json({ items: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch containment events.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

