"use client";

export default function PlansPage() {
  const mockPlans = [
    {
      code: "bronze",
      name: "Bronze",
      limits: "Basic usage • Suitable for single-user testing",
      updatedAt: "2025-11-20",
    },
    {
      code: "silver",
      name: "Silver",
      limits: "Extended usage • Suitable for small teams",
      updatedAt: "2025-11-19",
    },
    {
      code: "gold",
      name: "Gold",
      limits: "Full usage • Teams & advanced workflows",
      updatedAt: "2025-11-15",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Plans & Limits</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockPlans.map((plan) => (
          <div
            key={plan.code}
            className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold text-sky-400">{plan.name}</h2>
            <p className="text-gray-300 mt-2">{plan.limits}</p>
            <p className="text-xs text-gray-500 mt-3">
              Updated: {plan.updatedAt}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-400">
        This is a placeholder UI. Live plan evaluation will be connected via:
        <code className="ml-1 text-sky-300">/api/limits</code>
      </p>
    </div>
  );
}
