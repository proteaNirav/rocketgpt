import { NextResponse } from "next/server";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


export const dynamic = "force-dynamic";

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function POST(req: Request) {
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    // ignore parse errors; body stays null
  }

  const writeEnabled = isTruthyEnv(process.env.SELF_IMPROVE_WRITE);

  const payload = {
    ok: true,
    accepted: true,
    writeEnabled,
    message:
      "Self-improve run trigger stub â€“ executor wiring is pending. " +
      "This endpoint currently only acknowledges the request.",
    received: body,
    timestamp: new Date().toISOString(),
  };

  // 202 Accepted â€“ work would normally be queued for async execution
  return NextResponse.json(payload, { status: 202 });
}

// Optional: reject GET explicitly for /api/self-improve/run
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Method not allowed. Use POST to trigger self-improve run.",
    },
    { status: 405 }
  );
}
