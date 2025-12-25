import { NextResponse } from "next/server";
import { getRunHistory } from "@/lib/orchestrator/history";

export const dynamic = "force-dynamic";

export async function GET() {
  const history = await getRunHistory(20);

  return NextResponse.json({
    success: true,
    count: history.length,
    entries: history
  });
}
