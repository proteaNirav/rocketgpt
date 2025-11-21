"use client";

import React from "react";

interface LimitRow {
  id: string;
  label: string;
  value: string;
}

interface FeatureRow {
  id: string;
  feature: string;
  included: boolean;
}

const PLAN_NAME = "Bronze (Free)";
const MONTHLY_QUOTA = 2000;
const USED_QUOTA = 450;

const LIMITS: LimitRow[] = [
  { id: "1", label: "Requests per minute", value: "3" },
  { id: "2", label: "Requests per hour", value: "60" },
  { id: "3", label: "Monthly quota", value: "2000 messages" },
  { id: "4", label: "Max model tier", value: "Standard" },
];

const FEATURES: FeatureRow[] = [
  { id: "1", feature: "Access to GPT-4.1-mini", included: true },
  { id: "2", feature: "Access to GPT-4.1", included: false },
  { id: "3", feature: "Self-Improve workflows", included: true },
  { id: "4", feature: "CI Auto-Heal", included: true },
  { id: "5", feature: "Priority worker lane", included: false },
  { id: "6", feature: "Advanced analytics", included: false },
];

export default function PlansPage() {
  const pct = Math.round((USED_QUOTA / MONTHLY_QUOTA) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Plans & limits</h1>
        <p className="text-sm text-muted-foreground">
          View your current RocketGPT plan, usage, and applicable rate limits.
        </p>
      </header>

      {/* Plan summary */}
      <section className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{PLAN_NAME}</h2>
            <p className="text-sm text-muted-foreground">
              Free plan suitable for personal usage and testing.
            </p>
          </div>

          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted/30 transition-colors"
          >
            Upgrade plan
          </button>
        </div>

        {/* Usage bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly usage</span>
            <span className="text-muted-foreground">
              {USED_QUOTA} / {MONTHLY_QUOTA}
            </span>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      {/* Limits */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Rate limits</h3>
        <LimitsTable rows={LIMITS} />
      </section>

      {/* Features */}
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-3">Plan features</h3>
        <FeaturesTable rows={FEATURES} />
      </section>
    </div>
  );
}

function LimitsTable({ rows }: { rows: LimitRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Limit</th>
            <th className="px-3 py-2 text-left font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2">{row.label}</td>
              <td className="px-3 py-2">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeaturesTable({ rows }: { rows: FeatureRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Feature</th>
            <th className="px-3 py-2 text-left font-medium">Included</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-3 py-2">{row.feature}</td>
              <td className="px-3 py-2">
                {row.included ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-600/40 px-2 py-0.5 text-[11px]">
                    ✓ Included
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-600/40 px-2 py-0.5 text-[11px]">
                    ✗ Not available
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
