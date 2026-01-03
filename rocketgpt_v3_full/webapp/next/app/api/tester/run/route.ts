export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import { runTesterEngine } from "../testerEngine";

export async function POST(req: NextRequest) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const profileId: string = body?.profile || "base";
  const goal: string =
    body?.goal ||
    "Orchestrator \u2192 Tester HTTP status + profile test";
  const runId: string | undefined = body?.runId || undefined;

  const result = await runTesterEngine(profileId, goal, runId);

  return NextResponse.json(result);
}

