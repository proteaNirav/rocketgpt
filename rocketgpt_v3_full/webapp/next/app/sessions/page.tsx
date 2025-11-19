import { headers } from "next/headers";
import { SessionsTable } from "./SessionsTable";

type SessionStatus = "Active" | "Expired";

interface SessionSummary {
  id: string;
  model: string;
  createdAt: string;
  lastActiveAt: string;
  status: SessionStatus;
}

export default async function SessionsPage() {
  const hdrs = headers();
  const protocol = hdrs.get("x-forwarded-proto") ?? "http";
  const host =
    hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const base = `${protocol}://${host}`;

  let sessions: SessionSummary[] = [];
  let error: string | null = null;

  try {
    const res = await fetch(`${base}/api/sessions`, {
      cache: "no-store",
    });

    if (!res.ok) {
      error = `Failed to load sessions (HTTP ${res.status})`;
    } else {
      const data = (await res.json()) as { sessions?: SessionSummary[] };
      sessions = data.sessions ?? [];
    }
  } catch (e) {
    error = "Unable to load sessions. Please try again.";
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Manage chat sessions and conversations for RocketGPT.
          </p>
        </div>
      </header>

      <SessionsTable sessions={sessions} error={error} />
    </div>
  );
}
