import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  RuntimeContainmentStateSurface,
  RuntimeContainmentSummaryCounters,
  RuntimeContainmentHistoryEntry,
  RuntimeActiveContainmentEntry,
} from "./runtime-containment.types";

function defaultCounters(): RuntimeContainmentSummaryCounters {
  return {
    totalDecisions: 0,
    totalContainmentsApplied: 0,
    totalContainmentsSkipped: 0,
    totalCooldownSkips: 0,
    totalReintegrationStarted: 0,
    totalReintegrationsCompleted: 0,
    totalReintegrationsFailed: 0,
    totalRetired: 0,
  };
}

export function createInitialRuntimeContainmentState(runtimeId: string, nowIso: string): RuntimeContainmentStateSurface {
  return {
    schemaVersion: "rgpt.runtime_containment_state.v1",
    runtimeId,
    lastUpdatedAt: nowIso,
    activeContainments: [],
    latestDecision: null,
    latestReintegration: null,
    perTargetContainmentHistory: {},
    observationWindows: {},
    decisionCooldowns: {},
    summaryCounters: defaultCounters(),
  };
}

function parseArrayEntries(value: unknown): RuntimeActiveContainmentEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as RuntimeActiveContainmentEntry[];
}

function parseHistory(value: unknown): Record<string, RuntimeContainmentHistoryEntry[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const out: Record<string, RuntimeContainmentHistoryEntry[]> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(entry)) {
      continue;
    }
    out[key] = entry.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as RuntimeContainmentHistoryEntry[];
  }
  return out;
}

function parseState(value: unknown): RuntimeContainmentStateSurface | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "rgpt.runtime_containment_state.v1") {
    return null;
  }
  if (typeof record.runtimeId !== "string" || typeof record.lastUpdatedAt !== "string") {
    return null;
  }

  const summary =
    record.summaryCounters && typeof record.summaryCounters === "object" && !Array.isArray(record.summaryCounters)
      ? (record.summaryCounters as RuntimeContainmentSummaryCounters)
      : defaultCounters();

  return {
    schemaVersion: "rgpt.runtime_containment_state.v1",
    runtimeId: record.runtimeId,
    lastUpdatedAt: record.lastUpdatedAt,
    activeContainments: parseArrayEntries(record.activeContainments),
    latestDecision:
      record.latestDecision && typeof record.latestDecision === "object" && !Array.isArray(record.latestDecision)
        ? (record.latestDecision as RuntimeContainmentStateSurface["latestDecision"])
        : null,
    latestReintegration:
      record.latestReintegration && typeof record.latestReintegration === "object" && !Array.isArray(record.latestReintegration)
        ? (record.latestReintegration as RuntimeContainmentStateSurface["latestReintegration"])
        : null,
    perTargetContainmentHistory: parseHistory(record.perTargetContainmentHistory),
    observationWindows:
      record.observationWindows && typeof record.observationWindows === "object" && !Array.isArray(record.observationWindows)
        ? (record.observationWindows as Record<string, string>)
        : {},
    decisionCooldowns:
      record.decisionCooldowns && typeof record.decisionCooldowns === "object" && !Array.isArray(record.decisionCooldowns)
        ? (record.decisionCooldowns as Record<string, string>)
        : {},
    summaryCounters: {
      totalDecisions: Number(summary.totalDecisions) || 0,
      totalContainmentsApplied: Number(summary.totalContainmentsApplied) || 0,
      totalContainmentsSkipped: Number(summary.totalContainmentsSkipped) || 0,
      totalCooldownSkips: Number(summary.totalCooldownSkips) || 0,
      totalReintegrationStarted: Number(summary.totalReintegrationStarted) || 0,
      totalReintegrationsCompleted: Number(summary.totalReintegrationsCompleted) || 0,
      totalReintegrationsFailed: Number(summary.totalReintegrationsFailed) || 0,
      totalRetired: Number(summary.totalRetired) || 0,
    },
  };
}

export class RuntimeContainmentStateRepository {
  constructor(private readonly statePath: string) {}

  async read(runtimeId: string, nowIso: string): Promise<RuntimeContainmentStateSurface> {
    try {
      const raw = await readFile(this.statePath, "utf8");
      const parsed = parseState(JSON.parse(raw));
      if (!parsed) {
        return createInitialRuntimeContainmentState(runtimeId, nowIso);
      }
      return parsed;
    } catch {
      return createInitialRuntimeContainmentState(runtimeId, nowIso);
    }
  }

  async write(state: RuntimeContainmentStateSurface): Promise<void> {
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
}
