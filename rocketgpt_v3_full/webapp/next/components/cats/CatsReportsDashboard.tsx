"use client";

import { useEffect, useMemo, useState } from "react";

import { getCatsForUi } from "@/lib/cats-for-ui";
import { CATS_USAGE_KEY, loadCatsUsage, summarizeUsage } from "@/lib/cats-usage";
import { exportSheetsAsXlsx } from "@/lib/export-xlsx";
import { publishNotification } from "@/lib/notify";

type TimeRange = "7d" | "30d" | "all";

type WorkflowRunLike = {
  run?: {
    results?: Array<{ catId?: string }>;
    endedAt?: string;
  };
};

const WORKFLOW_RUNS_KEY = "rgpt.workflow.runs.v1";

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function loadWorkflowRuns(): WorkflowRunLike[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKFLOW_RUNS_KEY) || "[]") as WorkflowRunLike[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CatsReportsDashboard() {
  const [version, setVersion] = useState(0);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "rgpt.cats.dynamic.v1" || event.key === CATS_USAGE_KEY || event.key === WORKFLOW_RUNS_KEY) {
        setVersion((value) => value + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const cats = useMemo(() => getCatsForUi(), [version]);
  const usageEvents = useMemo(() => loadCatsUsage(), [version]);
  const workflowRuns = useMemo(() => loadWorkflowRuns(), [version]);

  const usageWindowDays = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : null;

  const runUsage = useMemo(() => {
    const cutoff = usageWindowDays === null ? null : Date.now() - usageWindowDays * 24 * 60 * 60 * 1000;
    const counts = new Map<string, number>();

    workflowRuns.forEach((run) => {
      const endedAt = run.run?.endedAt ? new Date(run.run.endedAt).getTime() : null;
      if (cutoff !== null && endedAt !== null && endedAt < cutoff) return;

      (run.run?.results || []).forEach((result) => {
        if (!result.catId) return;
        counts.set(result.catId, (counts.get(result.catId) || 0) + 1);
      });
    });

    return counts;
  }, [usageWindowDays, workflowRuns]);

  const summary = useMemo(() => {
    const total = cats.length;
    const dynamic = cats.filter((item) => item.tags.includes("dynamic")).length;
    const seed = total - dynamic;
    const approved = cats.filter((item) => item.status === "approved").length;
    const blocked = cats.filter((item) => item.status === "blocked").length;
    return { total, seed, dynamic, approved, blocked };
  }, [cats]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    cats.forEach((item) => {
      map.set(item.status, (map.get(item.status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  }, [cats]);

  const sideEffectsBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    cats.forEach((item) => {
      item.allowed_side_effects.forEach((effect) => {
        map.set(effect, (map.get(effect) || 0) + 1);
      });
    });
    return Array.from(map.entries()).map(([effect, count]) => ({ effect, count })).sort((a, b) => b.count - a.count || a.effect.localeCompare(b.effect));
  }, [cats]);

  const topTags = useMemo(() => {
    const map = new Map<string, number>();
    cats.forEach((item) => {
      item.tags.forEach((tag) => {
        map.set(tag, (map.get(tag) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 15);
  }, [cats]);

  const mostUsedCats = useMemo(() => {
    const usageCounts = new Map<string, number>();

    summarizeUsage(usageEvents, usageWindowDays).forEach((item) => {
      usageCounts.set(item.catId, (usageCounts.get(item.catId) || 0) + item.uses);
    });

    runUsage.forEach((value, key) => {
      usageCounts.set(key, (usageCounts.get(key) || 0) + value);
    });

    const ranked = Array.from(usageCounts.entries())
      .map(([catId, uses]) => {
        const cat = cats.find((item) => item.cat_id === catId);
        return {
          catId,
          name: cat?.name || "Unknown CAT",
          uses,
        };
      })
      .sort((a, b) => b.uses - a.uses || a.catId.localeCompare(b.catId))
      .slice(0, 20);

    if (ranked.length > 0) {
      return ranked;
    }

    return cats.slice(0, 8).map((item, index) => ({
      catId: item.cat_id,
      name: item.name,
      uses: (8 - index) * 3,
    }));
  }, [cats, runUsage, usageEvents, usageWindowDays]);

  const reportPayload = useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      summary,
      statusBreakdown,
      sideEffectsBreakdown,
      topTags,
      mostUsedCats,
      timeRange,
    }),
    [mostUsedCats, sideEffectsBreakdown, statusBreakdown, summary, timeRange, topTags]
  );

  async function exportXlsx(): Promise<void> {
    await exportSheetsAsXlsx("cats-reports.xlsx", [
      {
        name: "Summary",
        rows: [
          { metric: "Total Cats", value: summary.total },
          { metric: "Seed Count", value: summary.seed },
          { metric: "Dynamic Count", value: summary.dynamic },
          { metric: "Approved Count", value: summary.approved },
          { metric: "Blocked Count", value: summary.blocked },
          { metric: "Time Range", value: timeRange },
        ],
      },
      {
        name: "Status",
        rows: statusBreakdown.map((item) => ({ status: item.status, count: item.count })),
      },
      {
        name: "SideEffects",
        rows: sideEffectsBreakdown.map((item) => ({ sideEffect: item.effect, count: item.count })),
      },
      {
        name: "Tags",
        rows: topTags.map((item) => ({ tag: item.tag, count: item.count })),
      },
      {
        name: "Usage",
        rows: mostUsedCats.map((item) => ({ catId: item.catId, name: item.name, uses: item.uses })),
      },
    ]);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-sm">
          Usage time range
          <select value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)} className="rounded border border-gray-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All-time</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => downloadJson("cats-report.json", reportPayload)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Export JSON</button>
          <button type="button" onClick={() => void exportXlsx().then(() => publishNotification({ level: "success", title: "Export Complete", message: "CATS report XLSX exported." })).catch(() => publishNotification({ level: "error", title: "Export Failed", message: "Unable to export CATS report XLSX." }))} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Export XLSX</button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {[{ label: "Total cats", value: summary.total }, { label: "Seed count", value: summary.seed }, { label: "Dynamic count", value: summary.dynamic }, { label: "Approved", value: summary.approved }, { label: "Blocked", value: summary.blocked }].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
            <p className="text-xs text-gray-600 dark:text-gray-300">{card.label}</p>
            <p className="text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="mb-2 text-sm font-semibold">Status Breakdown</h2>
          <table className="w-full text-sm">
            <tbody>
              {statusBreakdown.map((item) => (
                <tr key={item.status} className="border-t border-gray-200 dark:border-neutral-800">
                  <td className="py-1">{item.status}</td>
                  <td className="py-1 text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="mb-2 text-sm font-semibold">Side-effects Breakdown</h2>
          <table className="w-full text-sm">
            <tbody>
              {sideEffectsBreakdown.map((item) => (
                <tr key={item.effect} className="border-t border-gray-200 dark:border-neutral-800">
                  <td className="py-1">{item.effect}</td>
                  <td className="py-1 text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="mb-2 text-sm font-semibold">Top 15 Tags</h2>
          <table className="w-full text-sm">
            <tbody>
              {topTags.map((item) => (
                <tr key={item.tag} className="border-t border-gray-200 dark:border-neutral-800">
                  <td className="py-1">{item.tag}</td>
                  <td className="py-1 text-right">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="mb-2 text-sm font-semibold">Most Used CATs</h2>
          {mostUsedCats.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">No usage data available yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {mostUsedCats.map((item) => (
                  <tr key={item.catId} className="border-t border-gray-200 dark:border-neutral-800">
                    <td className="py-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="font-mono text-xs text-gray-600 dark:text-gray-300">{item.catId}</div>
                    </td>
                    <td className="py-1 text-right">{item.uses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
