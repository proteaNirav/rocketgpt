import { NextResponse } from "next/server";

type SessionSummary = {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
};

type SessionsListResponse = {
  today: SessionSummary[];
  recent: SessionSummary[];
};

export async function GET() {
  const now = new Date();

  const today: SessionSummary[] = [
    {
      id: "sess-welcome",
      title: "Welcome to RocketGPT",
      model: "gpt-5.1",
      updatedAt: now.toISOString(),
    },
    {
      id: "sess-sql-optimizer",
      title: "SQL optimizer for leave balance SP",
      model: "db-gpt-4.1",
      updatedAt: now.toISOString(),
    },
  ];

  const recent: SessionSummary[] = [
    {
      id: "sess-rls-debug",
      title: "RLS debugging for Supabase",
      model: "gpt-4.1",
      updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "sess-workflow-v4",
      title: "Workflow design for RocketGPT v4",
      model: "llm-gpt-5.1",
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const payload: SessionsListResponse = { today, recent };

  return NextResponse.json(payload);
}
