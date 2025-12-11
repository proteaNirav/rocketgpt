export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type OverallStatus = "healthy" | "degraded" | "down";

type ModuleHealth = {
  ok: boolean;
  status: OverallStatus;
  latency_ms?: number;
  error?: string | null;
};

type OrchestratorHealthResponse = {
  success: boolean;
  service: string;
  version: string;
  environment: string;
  safe_mode: {
    enabled: boolean;
    source: "env" | "config" | "stub";
    enforced_routes: string[];
  };
  summary: {
    overall_status: OverallStatus;
    healthy_modules: string[];
    degraded_modules: string[];
    down_modules: string[];
  };
  health: {
    planner: ModuleHealth;
    builder: ModuleHealth;
    tester: ModuleHealth;
    approvals: ModuleHealth;
  };
  timestamp: string;
};

function getOrchestratorBaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_ORCH_BASE_URL &&
    process.env.NEXT_PUBLIC_ORCH_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_ORCH_BASE_URL
      : "http://localhost:3000";

  // Trim trailing slash if present
  return raw.replace(/\/$/, "");
}

async function fetchOrchestratorHealth(): Promise<OrchestratorHealthResponse | null> {
  const base = getOrchestratorBaseUrl();
  const url = `${base}/api/orchestrator/health`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[/health] Failed to fetch orchestrator health:", res.status);
      return null;
    }

    const data = (await res.json()) as OrchestratorHealthResponse;
    return data;
  } catch (err) {
    console.error("[/health] Error while fetching orchestrator health:", err);
    return null;
  }
}

function statusBadge(status: OverallStatus) {
  const baseClasses =
    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border";

  switch (status) {
    case "healthy":
      return (
        <span className={baseClasses + " border-green-500 text-green-500"}>
          ● Healthy
        </span>
      );
    case "degraded":
      return (
        <span className={baseClasses + " border-yellow-500 text-yellow-500"}>
          ● Degraded
        </span>
      );
    case "down":
      return (
        <span className={baseClasses + " border-red-500 text-red-500"}>
          ● Down
        </span>
      );
    default:
      return (
        <span className={baseClasses + " border-gray-500 text-gray-500"}>
          ● Unknown
        </span>
      );
  }
}

export default async function HealthPage() {
  const data = await fetchOrchestratorHealth();

  if (!data) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">RocketGPT Health</h1>
        <div className="border border-red-500/40 bg-red-500/5 rounded-lg p-4 text-sm text-red-500">
          Unable to load Orchestrator health. Please ensure the server is running and
          /api/orchestrator/health is reachable.
        </div>
      </div>
    );
  }

  const { summary, safe_mode, health } = data;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">RocketGPT Orchestrator Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Service: {data.service} · Version: {data.version} · Env:{" "}
            {data.environment}
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          {statusBadge(summary.overall_status)}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Updated at: {new Date(data.timestamp).toLocaleString()}
          </span>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-sm font-medium mb-2">Healthy modules</h2>
          <p className="text-sm text-green-600 dark:text-green-400">
            {summary.healthy_modules.length > 0
              ? summary.healthy_modules.join(", ")
              : "None"}
          </p>
        </div>
        <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-sm font-medium mb-2">Degraded modules</h2>
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            {summary.degraded_modules.length > 0
              ? summary.degraded_modules.join(", ")
              : "None"}
          </p>
        </div>
        <div className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
          <h2 className="text-sm font-medium mb-2">Down modules</h2>
          <p className="text-sm text-red-600 dark:text-red-400">
            {summary.down_modules.length > 0
              ? summary.down_modules.join(", ")
              : "None"}
          </p>
        </div>
      </section>

      <section className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40 space-y-2">
        <h2 className="text-sm font-medium">Safe-Mode</h2>
        <p className="text-sm">
          <span
            className={
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border " +
              (safe_mode.enabled
                ? "border-amber-500 text-amber-500"
                : "border-gray-400 text-gray-500")
            }
          >
            {safe_mode.enabled ? "Enabled" : "Disabled"}
          </span>
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Source: {safe_mode.source}
        </p>
        {safe_mode.enforced_routes?.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enforced routes: {safe_mode.enforced_routes.join(", ")}
          </p>
        )}
      </section>

      <section className="border rounded-xl p-4 bg-white dark:bg-gray-900/60">
        <h2 className="text-sm font-medium mb-3">Module details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 pr-4 font-semibold">Module</th>
                <th className="text-left py-2 pr-4 font-semibold">Status</th>
                <th className="text-left py-2 pr-4 font-semibold">OK</th>
                <th className="text-left py-2 pr-4 font-semibold">Latency (ms)</th>
                <th className="text-left py-2 pr-4 font-semibold">Error</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(health).map(([name, module]) => (
                <tr
                  key={name}
                  className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <td className="py-2 pr-4 capitalize">{name}</td>
                  <td className="py-2 pr-4">{statusBadge(module.status)}</td>
                  <td className="py-2 pr-4">{module.ok ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">
                    {module.latency_ms != null ? module.latency_ms : "-"}
                  </td>
                  <td className="py-2 pr-4 text-xs text-red-500">
                    {module.error ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border rounded-xl p-4 bg-gray-50 dark:bg-gray-900/40">
        <h2 className="text-sm font-medium mb-2">Raw JSON</h2>
        <pre className="text-xs whitespace-pre-wrap break-all max-h-72 overflow-auto bg-black/80 text-green-300 rounded-lg p-3">
          {JSON.stringify(data, null, 2)}
        </pre>
      </section>
    </div>
  );
}
