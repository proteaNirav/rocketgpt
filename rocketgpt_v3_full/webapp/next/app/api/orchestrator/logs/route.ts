import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  const logPath = path.join(process.cwd(), "RGPT-HealthProbe.log");

  let content = "No logs available.";
  if (fs.existsSync(logPath)) {
    const lines = fs.readFileSync(logPath, "utf8").trim().split(/\r?\n/);
    content = lines.slice(-30).join("\n");
  }

  return NextResponse.json({
    success: true,
    recent_logs: content,
  });
}
