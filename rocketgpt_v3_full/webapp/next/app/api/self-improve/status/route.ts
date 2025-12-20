import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SelfImproveMode = "simulation" | "write-enabled";

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function GET() {
  const writeEnabled = isTruthyEnv(process.env.SELF_IMPROVE_WRITE);
  const mode: SelfImproveMode = writeEnabled ? "write-enabled" : "simulation";

  const payload = {
    ok: true,
    writeEnabled,
    mode,
    timestamp: new Date().toISOString(),
    note:
      "This is a minimal self-improve status endpoint. Executor wiring is pending. " +
      "Toggle SELF_IMPROVE_WRITE in environment to control write mode.",
  };

  return NextResponse.json(payload, { status: 200 });
}
