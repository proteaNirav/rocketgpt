export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 });
}

function forbidden(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const key = req.headers.get("x-rgpt-internal-key") ?? "";
    const expected = process.env.RGPT_INTERNAL_KEY ?? "";

    if (!expected || key !== expected) {
      return forbidden("Unauthorized");
    }

    const url = new URL(req.url);
    const runId = (url.searchParams.get("runId") ?? "").trim();
    const tailRaw = (url.searchParams.get("tail") ?? "").trim();

    if (!runId) return badRequest("Missing query param: runId");

    // Optional tail (default: 2000 lines max read, then tail within that)
    let tail = 0;
    if (tailRaw) {
      tail = Number(tailRaw);
      if (!Number.isFinite(tail) || tail < 1 || tail > 5000) {
        return badRequest("Invalid tail. Use 1..5000");
      }
    }

    // next/rocketgpt_runs/<runId>/logs/ledger.jsonl
    const baseDir = process.cwd();
    const ledgerPath = path.join(baseDir, "rocketgpt_runs", runId, "logs", "ledger.jsonl");

    if (!fs.existsSync(ledgerPath)) {
      return NextResponse.json(
        { success: false, runId, error: "Ledger file not found", ledgerPath },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(ledgerPath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    // Basic guardrails
    const capped = lines.slice(-2000);

    const sliced = tail > 0 ? capped.slice(-tail) : capped;

    const entries: any[] = [];
    for (const line of sliced) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // ignore malformed line
      }
    }

    return NextResponse.json({
      success: true,
      runId,
      count: entries.length,
      entries,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
