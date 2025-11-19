const demoSessions = [
  {
    id: "sess_12345",
    model: "gpt-5.1",
    created: "2025-11-19 10:32",
    lastActive: "2025-11-19 10:45",
    status: "Active",
  },
  {
    id: "sess_67890",
    model: "claude-3-opus",
    created: "2025-11-18 17:05",
    lastActive: "2025-11-18 17:40",
    status: "Expired",
  },
];

const statusClassName = (status: string) => {
  switch (status) {
    case "Active":
      return "inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium";
    case "Expired":
      return "inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-xs font-medium";
    default:
      return "inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-medium";
  }
};

export default function SessionsPage() {
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
              {demoSessions.length === 0 ? (
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
                demoSessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-t hover:bg-muted/60 transition-colors"
                  >
                    <td className="p-3 font-mono text-xs">{session.id}</td>
                    <td className="p-3">{session.model}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {session.created}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {session.lastActive}
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
