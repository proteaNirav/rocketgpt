"use client";

export function HomeV2LeftPane() {
  const sessions = [
    { id: "sess_1", title: "UI Fix Discussion", model: "gpt-5.1", updated: "2025-11-20" },
    { id: "sess_2", title: "RLS Debugging", model: "gpt-4.1", updated: "2025-11-19" },
    { id: "sess_3", title: "Workflow Planning", model: "gpt-5.1", updated: "2025-11-18" }
  ];

  return (
    <div className="w-64 border-r border-border p-4 space-y-4 hidden lg:block">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Sessions</h2>
        <button className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground">
          New
        </button>
      </div>

      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="p-2 rounded border border-border hover:bg-muted cursor-pointer"
          >
            <div className="text-sm font-medium">{s.title}</div>
            <div className="text-xs text-muted-foreground">
              {s.model} · {s.updated}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
