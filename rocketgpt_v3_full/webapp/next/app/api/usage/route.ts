import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { runtimeGuard } from "@/rgpt/runtime/runtime-guard";
export const runtime = "nodejs";


type UsageEntry = {
  date: string;
  requests: number;
  tokens: number;
};

const demoUsage: UsageEntry[] = [
  { date: new Date().toISOString(), requests: 3, tokens: 1400 },
  { date: new Date(Date.now() - 86400000).toISOString(), requests: 5, tokens: 2100 },
];

export async function GET() {
  const req = new Request("http://localhost/_rgpt", { headers: headers() as any });
  await runtimeGuard(req, { permission: "API_CALL" }); // TODO(S4): tighten permission per route
  // In future, replace demoUsage with real usage summaries.
  return NextResponse.json({
    usage: demoUsage,
  });
}
