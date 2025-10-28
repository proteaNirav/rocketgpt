'use client';
import { useEffect, useMemo, useState } from 'react';

type UsageRow = {
  user_id: string;
  email: string;
  endpoint: string;
  allowed_hits: number;
  blocked_hits: number;
  last_call: string | null;
};
type PlanRow = {
  plan_code: string;
  plan_name: string;
  per_minute: number;
  per_hour: number;
  monthly_price_inr: number;
  monthly_price_usd: number;
};

export default function LimitsPage() {
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [userPlan, setUserPlan] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/limits").then(r => r.json()).then(j => {
      setUsage(j.usage || []);
      setUserPlan(p => ({ ...p, [user_id]: prev }));
      setPlans(j.plans || []);
      // derive current user plan from usage? If you want exact, you can also fetch rl_user_plans separately.
      setLoading(false);
    });
  }, []);

  const planCodes = useMemo(() => plans.map(p => p.plan_code), [plans]);

  const rows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return usage.filter(r => !f || r.email?.toLowerCase().includes(f) || r.user_id?.toLowerCase().includes(f));
  }, [usage, filter]);

  async function updatePlan(user_id: string, plan_code: string) {
    const prev = userPlan[user_id];
    setUserPlan(p => ({ ...p, [user_id]: plan_code }));
    const res = await fetch("/api/limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, plan_code })
    });
    if (!res.ok) {
      setUserPlan(p => ({ ...p, [user_id]: prev }));
      const j = await res.json().catch(() => ({}));
      alert(`Update failed: ${j?.error || res.statusText}`);
    }
  }

  if (loading) return <main className="p-6">Loading limits…</main>;

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Rate Limit Overrides</h1>
      <div className="flex gap-2 items-center">
        <input
          className="border rounded px-3 py-2 bg-neutral-900 text-gray-100 w-80"
          placeholder="Filter by email or user id"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <span className="text-sm text-gray-400">{rows.length} users</span>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-800 text-gray-200">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2">Endpoint</th>
              <th className="px-3 py-2">Allowed</th>
              <th className="px-3 py-2">Blocked</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Last Call</th>
            </tr>
          </thead>
          <tbody className="bg-neutral-900 text-gray-100">
            {rows.map((r) => (
              <tr key={`${r.user_id}-${r.endpoint}`}>
                <td className="px-3 py-2">{r.email || r.user_id}</td>
                <td className="px-3 py-2">{r.endpoint}</td>
                <td className="px-3 py-2 text-green-400 text-center">{r.allowed_hits}</td>
                <td className="px-3 py-2 text-red-400 text-center">{r.blocked_hits}</td>
                <td className="px-3 py-2">
                  <select
                    className="border rounded px-2 py-1 bg-neutral-800"
                    value={userPlan[r.user_id] || 'BRONZE'}
                    onChange={(e) => updatePlan(r.user_id, e.target.value)}
                  >
                    {planCodes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-gray-400">
                  {r.last_call ? new Date(r.last_call).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
