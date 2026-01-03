import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


type LogEntry = {
  id: string;
  timestamp: string;
  endpoint: string;
  model: string;
  status: "ok" | "error";
  tokens?: number;
};

const demoLogs: LogEntry[] = [
  {
    id: "1",
    timestamp: new Date().toISOString(),
    endpoint: "/api/demo/chat",
    model: "gpt-4o-mini",
    status: "ok",
    tokens: 320,
  },
  {
    id: "2",
    timestamp: new Date().toISOString(),
    endpoint: "/api/planner",
    model: "gpt-4o-mini",
    status: "error",
    tokens: 0,
  },
];

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  // In future, replace demoLogs with real DB-backed logs from Supabase/Postgres.
  return NextResponse.json({
    logs: demoLogs,
  });
}
