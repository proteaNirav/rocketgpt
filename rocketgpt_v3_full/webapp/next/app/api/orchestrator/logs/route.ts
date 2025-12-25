import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
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
