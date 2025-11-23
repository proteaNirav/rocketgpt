"use client";

export default function LogsPage() {
  const mockLogs = [
    {
      id: "lg-001",
      level: "info",
      message: "System boot completed",
      timestamp: "2025-11-20 10:21:45",
    },
    {
      id: "lg-002",
      level: "error",
      message: "Rate limit exceeded on /api/core",
      timestamp: "2025-11-19 15:05:22",
    },
    {
      id: "lg-003",
      level: "warn",
      message: "Model registry responded slowly",
      timestamp: "2025-11-19 12:44:10",
    },
  ];

  const levelColor: Record<string, string> = {
    info: "text-emerald-300",
    warn: "text-yellow-300",
    error: "text-red-400",
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">System Logs</h1>

      <div className="space-y-3">
        {mockLogs.map((log) => (
          <div
            key={log.id}
            className="rounded-lg border border-gray-700 bg-gray-900 p-4"
          >
            <p className={`font-semibold ${levelColor[log.level]}`}>
              [{log.level.toUpperCase()}]
            </p>
            <p className="text-slate-200">{log.message}</p>
            <p className="text-xs text-slate-500 mt-1">{log.timestamp}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        This is a placeholder view. Live logs will come from the backend / GitHub
        Actions pipelines and internal self-heal events.
      </p>
    </div>
  );
}

