import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  RuntimeEvolutionSignalsStateSurface,
  RuntimeEvolutionSummaryCounters,
  RuntimeEvolutionDedupeState,
  RuntimeHealingAssessment,
} from "./runtime-evolution-signals.types";

function defaultCounters(): RuntimeEvolutionSummaryCounters {
  return {
    totalLearningSignalsCaptured: 0,
    totalImprovementCandidatesDetected: 0,
    totalHighSeverityCandidates: 0,
    totalHealingAssessmentsHealthy: 0,
    totalHealingAssessmentsWatch: 0,
    totalHealingAssessmentsStressed: 0,
    totalHealingAssessmentsUnstable: 0,
  };
}

function defaultDedupeState(): RuntimeEvolutionDedupeState {
  return {
    signalCooldowns: {},
    candidateCooldowns: {},
    lastHealingAssessment: null,
    lastHealingMetricHash: null,
  };
}

export function createInitialRuntimeEvolutionSignalsState(
  runtimeId: string,
  nowIso: string
): RuntimeEvolutionSignalsStateSurface {
  return {
    schemaVersion: "rgpt.runtime_evolution_signals_state.v1",
    runtimeId,
    lastUpdatedAt: nowIso,
    latestEvaluation: null,
    latestHealingTelemetry: null,
    recentLearningSignals: [],
    activeImprovementCandidates: [],
    summaryCounters: defaultCounters(),
    dedupeState: defaultDedupeState(),
  };
}

function parseAssessment(value: unknown): RuntimeHealingAssessment | null {
  if (value === "healthy" || value === "watch" || value === "stressed" || value === "unstable") {
    return value;
  }
  return null;
}

function parseState(value: unknown): RuntimeEvolutionSignalsStateSurface | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "rgpt.runtime_evolution_signals_state.v1") {
    return null;
  }
  if (typeof record.runtimeId !== "string" || typeof record.lastUpdatedAt !== "string") {
    return null;
  }

  const summary =
    record.summaryCounters && typeof record.summaryCounters === "object" && !Array.isArray(record.summaryCounters)
      ? (record.summaryCounters as RuntimeEvolutionSummaryCounters)
      : defaultCounters();

  const dedupe =
    record.dedupeState && typeof record.dedupeState === "object" && !Array.isArray(record.dedupeState)
      ? (record.dedupeState as Record<string, unknown>)
      : {};

  return {
    schemaVersion: "rgpt.runtime_evolution_signals_state.v1",
    runtimeId: record.runtimeId,
    lastUpdatedAt: record.lastUpdatedAt,
    latestEvaluation:
      record.latestEvaluation && typeof record.latestEvaluation === "object" && !Array.isArray(record.latestEvaluation)
        ? (record.latestEvaluation as RuntimeEvolutionSignalsStateSurface["latestEvaluation"])
        : null,
    latestHealingTelemetry:
      record.latestHealingTelemetry && typeof record.latestHealingTelemetry === "object" && !Array.isArray(record.latestHealingTelemetry)
        ? (record.latestHealingTelemetry as RuntimeEvolutionSignalsStateSurface["latestHealingTelemetry"])
        : null,
    recentLearningSignals: Array.isArray(record.recentLearningSignals)
      ? record.recentLearningSignals.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as RuntimeEvolutionSignalsStateSurface["recentLearningSignals"]
      : [],
    activeImprovementCandidates: Array.isArray(record.activeImprovementCandidates)
      ? record.activeImprovementCandidates.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as RuntimeEvolutionSignalsStateSurface["activeImprovementCandidates"]
      : [],
    summaryCounters: {
      totalLearningSignalsCaptured: Number(summary.totalLearningSignalsCaptured) || 0,
      totalImprovementCandidatesDetected: Number(summary.totalImprovementCandidatesDetected) || 0,
      totalHighSeverityCandidates: Number(summary.totalHighSeverityCandidates) || 0,
      totalHealingAssessmentsHealthy: Number(summary.totalHealingAssessmentsHealthy) || 0,
      totalHealingAssessmentsWatch: Number(summary.totalHealingAssessmentsWatch) || 0,
      totalHealingAssessmentsStressed: Number(summary.totalHealingAssessmentsStressed) || 0,
      totalHealingAssessmentsUnstable: Number(summary.totalHealingAssessmentsUnstable) || 0,
    },
    dedupeState: {
      signalCooldowns:
        dedupe.signalCooldowns && typeof dedupe.signalCooldowns === "object" && !Array.isArray(dedupe.signalCooldowns)
          ? (dedupe.signalCooldowns as Record<string, string>)
          : {},
      candidateCooldowns:
        dedupe.candidateCooldowns && typeof dedupe.candidateCooldowns === "object" && !Array.isArray(dedupe.candidateCooldowns)
          ? (dedupe.candidateCooldowns as Record<string, string>)
          : {},
      lastHealingAssessment: parseAssessment(dedupe.lastHealingAssessment),
      lastHealingMetricHash: typeof dedupe.lastHealingMetricHash === "string" ? dedupe.lastHealingMetricHash : null,
    },
  };
}

export class RuntimeEvolutionSignalsStateRepository {
  constructor(private readonly statePath: string) {}

  async read(runtimeId: string, nowIso: string): Promise<RuntimeEvolutionSignalsStateSurface> {
    try {
      const raw = await readFile(this.statePath, "utf8");
      const parsed = parseState(JSON.parse(raw));
      if (!parsed) {
        return createInitialRuntimeEvolutionSignalsState(runtimeId, nowIso);
      }
      return parsed;
    } catch {
      return createInitialRuntimeEvolutionSignalsState(runtimeId, nowIso);
    }
  }

  async write(state: RuntimeEvolutionSignalsStateSurface): Promise<void> {
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
}
