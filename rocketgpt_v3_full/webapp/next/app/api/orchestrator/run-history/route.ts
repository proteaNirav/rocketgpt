import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { getRunHistory } from "@/lib/orchestrator/history";
export const runtime = "nodejs";


export const dynamic = "force-dynamic";

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const history = await getRunHistory(20);

  return NextResponse.json({
    success: true,
    count: history.length,
    entries: history
  });
}
