import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  RuntimeStabilityBand,
  RuntimeStabilityStateSurface,
  RuntimeStabilitySummaryCounters,
  RuntimeDegradationAction,
  RuntimeInstabilityPattern,
  RuntimeTargetStabilityEvaluation,
} from "./runtime-stability.types";

function defaultCounters(): RuntimeStabilitySummaryCounters {
  return {
    totalEvaluations: 0,
    totalCooldownSkips: 0,
    totalPatternDetections: 0,
    totalOscillationDetections: 0,
    totalDegradationStateChanges: 0,
    totalCriticalTriggers: 0,
  };
}

export function createInitialRuntimeStabilityState(runtimeId: string, nowIso: string): RuntimeStabilityStateSurface {
  return {
    schemaVersion: "rgpt.runtime_stability_state.v1",
    runtimeId,
    lastUpdatedAt: nowIso,
    latestEvaluation: null,
    targetStabilityIndex: {},
    recentInstabilityPatterns: [],
    degradationState: {
      band: "normal",
      action: "no_action",
      updatedAt: nowIso,
      changed: false,
    },
    evaluationCooldowns: {},
    summaryCounters: defaultCounters(),
  };
}

function parseBand(value: unknown): RuntimeStabilityBand {
  if (value === "normal" || value === "watch" || value === "degraded" || value === "constrained" || value === "critical") {
    return value;
  }
  return "normal";
}

function parseAction(value: unknown): RuntimeDegradationAction {
  if (
    value === "no_action" ||
    value === "increase_observation" ||
    value === "reduce_new_work_intake" ||
    value === "prefer_healthy_targets_only" ||
    value === "suppress_repeated_repair_on_unstable_targets" ||
    value === "recommend_safe_mode_review"
  ) {
    return value;
  }
  return "no_action";
}

function parsePatterns(value: unknown): RuntimeInstabilityPattern[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is RuntimeInstabilityPattern => typeof item === "string");
}

function parseState(value: unknown): RuntimeStabilityStateSurface | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "rgpt.runtime_stability_state.v1") {
    return null;
  }
  if (typeof record.runtimeId !== "string" || typeof record.lastUpdatedAt !== "string") {
    return null;
  }

  const summary =
    record.summaryCounters && typeof record.summaryCounters === "object" && !Array.isArray(record.summaryCounters)
      ? (record.summaryCounters as RuntimeStabilitySummaryCounters)
      : defaultCounters();

  const targetStabilityIndex =
    record.targetStabilityIndex && typeof record.targetStabilityIndex === "object" && !Array.isArray(record.targetStabilityIndex)
      ? (record.targetStabilityIndex as Record<string, RuntimeTargetStabilityEvaluation>)
      : {};

  const degradationState =
    record.degradationState && typeof record.degradationState === "object" && !Array.isArray(record.degradationState)
      ? (record.degradationState as Record<string, unknown>)
      : {};

  return {
    schemaVersion: "rgpt.runtime_stability_state.v1",
    runtimeId: record.runtimeId,
    lastUpdatedAt: record.lastUpdatedAt,
    latestEvaluation:
      record.latestEvaluation && typeof record.latestEvaluation === "object" && !Array.isArray(record.latestEvaluation)
        ? (record.latestEvaluation as RuntimeStabilityStateSurface["latestEvaluation"])
        : null,
    targetStabilityIndex,
    recentInstabilityPatterns: parsePatterns(record.recentInstabilityPatterns),
    degradationState: {
      band: parseBand(degradationState.band),
      action: parseAction(degradationState.action),
      updatedAt: typeof degradationState.updatedAt === "string" ? degradationState.updatedAt : record.lastUpdatedAt,
      changed: degradationState.changed === true,
    },
    evaluationCooldowns:
      record.evaluationCooldowns && typeof record.evaluationCooldowns === "object" && !Array.isArray(record.evaluationCooldowns)
        ? (record.evaluationCooldowns as Record<string, string>)
        : {},
    summaryCounters: {
      totalEvaluations: Number(summary.totalEvaluations) || 0,
      totalCooldownSkips: Number(summary.totalCooldownSkips) || 0,
      totalPatternDetections: Number(summary.totalPatternDetections) || 0,
      totalOscillationDetections: Number(summary.totalOscillationDetections) || 0,
      totalDegradationStateChanges: Number(summary.totalDegradationStateChanges) || 0,
      totalCriticalTriggers: Number(summary.totalCriticalTriggers) || 0,
    },
  };
}

export class RuntimeStabilityStateRepository {
  constructor(private readonly statePath: string) {}

  async read(runtimeId: string, nowIso: string): Promise<RuntimeStabilityStateSurface> {
    try {
      const raw = await readFile(this.statePath, "utf8");
      const parsed = parseState(JSON.parse(raw));
      if (!parsed) {
        return createInitialRuntimeStabilityState(runtimeId, nowIso);
      }
      return parsed;
    } catch {
      return createInitialRuntimeStabilityState(runtimeId, nowIso);
    }
  }

  async write(state: RuntimeStabilityStateSurface): Promise<void> {
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
}
