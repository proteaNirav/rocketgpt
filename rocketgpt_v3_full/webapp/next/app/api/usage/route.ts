import { NextResponse } from "next/server";

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
  // In future, replace demoUsage with real usage summaries.
  return NextResponse.json({
    usage: demoUsage,
  });
}
