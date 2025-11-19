import { headers } from "next/headers";

type SessionStatus = "Active" | "Expired";

interface SessionSummary {
  id: string;
  model: string;
  createdAt: string;
  lastActiveAt: string;
  status: SessionStatus;
}

const statusClassName = (status: SessionStatus) => {
  switch (status) {
    case "Active":
      return "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium";
    case "Expired":
      return "inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs font-medium";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-medium";
  }
};

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

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search sessions..."
            className="border rounded-md px-3 py-2 text-sm w-full max-w-xs"
          />

          <select className="border rounded-md px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Session ID</th>
                <th className="text-left p-3 font-medium">Model</th>
                <th className="text-left p-3 font-medium">Created</th>
                <th className="text-left p-3 font-medium">Last Active</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-sm text-muted-foreground"
                  >
                    Unable to load sessions data.
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-6 text-center text-sm text-muted-foreground"
                  >
                    No sessions yet. New conversations will appear here once
                    users start chatting with RocketGPT.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-t hover:bg-muted/60 transition-colors"
                  >
                    <td className="p-3 font-mono text-xs">{session.id}</td>
                    <td className="p-3">{session.model}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {session.createdAt}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {session.lastActiveAt}
                    </td>
                    <td className="p-3">
                      <span className={statusClassName(session.status)}>
                        {session.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-xs font-medium underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
