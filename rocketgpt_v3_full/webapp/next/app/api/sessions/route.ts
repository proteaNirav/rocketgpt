import { NextResponse } from "next/server";

type SessionStatus = "Active" | "Expired";

export interface SessionSummary {
  id: string;
  model: string;
  createdAt: string;
  lastActiveAt: string;
  status: SessionStatus;
}

const demoSessions: SessionSummary[] = [
  {
    id: "sess_12345",
    model: "gpt-5.1",
    createdAt: "2025-11-19 10:32",
    lastActiveAt: "2025-11-19 10:45",
    status: "Active",
  },
  {
    id: "sess_67890",
    model: "claude-3-opus",
    createdAt: "2025-11-18 17:05",
    lastActiveAt: "2025-11-18 17:40",
    status: "Expired",
  },
];

export async function GET() {
  // TODO (R-UI-1 / later steps):
  //  - Replace demoSessions with real data from Supabase / DB / logs
  return NextResponse.json({
    sessions: demoSessions,
  });
}
