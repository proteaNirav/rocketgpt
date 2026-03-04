export const CATS_USAGE_KEY = "rgpt.cats.usage.v1";

export type CatsUsageAction =
  | "copy_replay"
  | "add_to_workflow"
  | "run_completed"
  | "save_dynamic"
  | "generator_save";

export type CatsUsageEvent = {
  id: string;
  catId: string;
  canonicalName?: string;
  action: CatsUsageAction;
  timestamp: string;
};

function safeParse(raw: string | null): CatsUsageEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CatsUsageEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadCatsUsage(): CatsUsageEvent[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(CATS_USAGE_KEY));
}

export function recordCatsUsage(event: Omit<CatsUsageEvent, "id" | "timestamp">): CatsUsageEvent {
  const next: CatsUsageEvent = {
    ...event,
    id: `usage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window === "undefined") return next;

  const current = loadCatsUsage();
  const updated = [next, ...current].slice(0, 2000);
  window.localStorage.setItem(CATS_USAGE_KEY, JSON.stringify(updated));
  return next;
}

export function summarizeUsage(events: CatsUsageEvent[], windowDays: number | null): Array<{ catId: string; uses: number }> {
  const cutoff = windowDays === null ? null : Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const filtered = cutoff === null
    ? events
    : events.filter((event) => new Date(event.timestamp).getTime() >= cutoff);

  const counts = new Map<string, number>();
  filtered.forEach((event) => {
    counts.set(event.catId, (counts.get(event.catId) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([catId, uses]) => ({ catId, uses }))
    .sort((a, b) => b.uses - a.uses || a.catId.localeCompare(b.catId));
}
