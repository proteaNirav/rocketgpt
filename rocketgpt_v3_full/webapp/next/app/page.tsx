"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  ok: boolean;
  startedAt?: string;
  commit?: string;
  env?: string;
};

type Plan = {
  plan_code: string;
  plan_name: string;
  per_minute?: number;
  per_hour?: number;
  per_day?: number;
};

type LimitsResponse = {
  usage?: any[];
  plans?: Plan[];
};

function formatUptime(startedAt?: string): string {
  if (!startedAt) return "Unknown";
  const started = new Date(startedAt);
  if (Number.isNaN(started.getTime())) return "Unknown";

  const now = new Date();
  const diffMs = now.getTime() - started.getTime();
  if (diffMs < 0) return "Unknown";

  const diffSec = Math.floor(diffMs / 1000);
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [healthRes, limitsRes] = await Promise.all([
          fetch("/api/health"),
          fetch("/api/limits"),
        ]);

        if (!healthRes.ok) {
          throw new Error(`Health API failed (${healthRes.status})`);
        }
        if (!limitsRes.ok) {
          throw new Error(`Limits API failed (${limitsRes.status})`);
        }

        const healthJson = (await healthRes.json()) as HealthResponse;
        const limitsJson = (await limitsRes.json()) as LimitsResponse;

        setHealth(healthJson);
        setLimits(limitsJson);
      } catch (err: any) {
        console.error("Failed to load dashboard data", err);
        setError(err?.message ?? "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const primaryPlan: Plan | undefined =
    limits?.plans?.find((p) => p.plan_code === "BRONZE") ??
    (limits?.plans && limits.plans[0]);

  const statusLabel =
    health?.ok === true ? "Online" : health?.ok === false ? "Degraded" : "Unknown";

  const statusColor =
    health?.ok === true
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : health?.ok === false
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-slate-500/15 text-slate-300 border-slate-500/30";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            RocketGPT Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Live status and limits from the running RocketGPT instance.
          </p>
        </div>
        <div
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${statusColor}`}
        >
          <span className="mr-1 h-2 w-2 rounded-full bg-current" />
          {statusLabel}
        </div>
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Loading live status from /api/health and /api/limits...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Uptime & environment */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Instance
            </div>
            <div className="mt-2 text-lg font-semibold">
              {formatUptime(health?.startedAt)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Uptime since{" "}
              {health?.startedAt
                ? new Date(health.startedAt).toLocaleString()
                : "unknown"}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground break-all">
              Commit:{" "}
              {health?.commit
                ? health.commit.substring(0, 7)
                : "n/a"}
            </div>
            {health?.env && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Env: {health.env}
              </div>
            )}
          </div>

          {/* Plan & limits */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Plan & Limits
            </div>
            <div className="mt-2 text-lg font-semibold">
              {primaryPlan?.plan_name ?? "Unknown plan"}
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              <div>
                Per minute:{" "}
                <span className="font-semibold text-foreground">
                  {primaryPlan?.per_minute ?? "—"}
                </span>
              </div>
              <div>
                Per hour:{" "}
                <span className="font-semibold text-foreground">
                  {primaryPlan?.per_hour ?? "—"}
                </span>
              </div>
              <div>
                Per day:{" "}
                <span className="font-semibold text-foreground">
                  {primaryPlan?.per_day ?? "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Usage placeholder */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs font-medium uppercase text-muted-foreground">
              Usage snapshot
            </div>
            {limits?.usage && limits.usage.length > 0 ? (
              <div className="mt-2 text-sm text-muted-foreground">
                {limits.usage.length} usage entries recorded.
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">
                No usage records available yet.
              </div>
            )}
            <div className="mt-3 text-[11px] text-muted-foreground">
              This section will evolve into a full usage chart in the next
              iteration.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
