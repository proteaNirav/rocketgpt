import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  return NextResponse.json({ ok: false, error: "NOT_IMPLEMENTED", route: "orchestrator/builder/execute-next/route.ts" }, { status: 501 });
}

export async function POST() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  return NextResponse.json({ ok: false, error: "NOT_IMPLEMENTED", route: "orchestrator/builder/execute-next/route.ts" }, { status: 501 });
}
