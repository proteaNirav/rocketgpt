import StatusCard from "@/app/components/StatusCard";
import { getJSON } from "@/app/lib/api";

type Limits = {
  usage: any[];
  plans: { plan_code: string; plan_name: string; per_minute: number; per_hour: number }[];
};

async function getLimits() {
  const { ok, data, error } = await getJSON<Limits>("/api/limits", undefined, 3000);
  return { ok, data, error };
}
async function getHealth() {
  const { ok, data, error } = await getJSON<any>("/api/health", undefined, 3000);
  return { ok, data, error };
}

export default async function Home() {
  const [limits, health] = await Promise.all([getLimits(), getHealth()]);
  const plan = limits.data?.plans?.[0];

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">RocketGPT</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="Plan" value={plan?.plan_name ?? "Unknown"} hint={plan?.plan_code} />
        <StatusCard title="Per Minute" value={plan?.per_minute ?? "—"} />
        <StatusCard title="Per Hour" value={plan?.per_hour ?? "—"} />
        <StatusCard title="Commit" value={health.data?.commit ?? "—"} hint={health.data?.version} />
      </div>

      {!limits.ok ? (
        <div className="text-red-600 text-sm">Limits API error: {limits.error}</div>
      ) : null}

      <div className="text-xs text-gray-400">
        Health: {health.ok ? "OK" : `ERR: ${health.error}`} • Started: {health.data?.startedAt ?? "—"}
      </div>
    </main>
  );
}
