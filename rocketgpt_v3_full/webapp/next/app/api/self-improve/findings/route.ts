import { NextRequest, NextResponse } from "next/server";
import { isPrivilegedRead } from "@/lib/governance/auth";
import { checkRateLimit } from "../_lib/rateLimit";
import { isSelfImproveEnabled, runSelfImproveCli } from "../_lib/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  if (!isSelfImproveEnabled()) {
    return NextResponse.json({ error: "SELF_IMPROVE_ENABLED is false." }, { status: 503 });
  }
  if (!isPrivilegedRead(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for") || "local";
  const limited = checkRateLimit(`findings:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }
  try {
    const result = await runSelfImproveCli(["findings"]);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "list findings failed" },
      { status: 500 }
    );
  }
}
