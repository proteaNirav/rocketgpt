import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  RuntimeLearningCounters,
  RuntimeLearningStateSurface,
  RuntimeLearningStatus,
  RuntimePatternDetectionResult,
  RuntimePreventionRecommendationClass,
} from "./runtime-repair-learning.types";

function createDefaultCounters(): RuntimeLearningCounters {
  return {
    totalAnalyses: 0,
    totalCompleted: 0,
    totalSkipped: 0,
    totalRecurrencesDetected: 0,
    totalRootCausesIdentified: 0,
    totalRecommendationsGenerated: 0,
  };
}

export function createInitialRuntimeLearningState(runtimeId: string, nowIso: string): RuntimeLearningStateSurface {
  return {
    schemaVersion: "rgpt.runtime_repair_learning_state.v1",
    runtimeId,
    status: "idle",
    lastUpdatedAt: nowIso,
    latestLearningResult: null,
    recentPatterns: [],
    recentRecommendations: [],
    recurrenceCounters: {},
    learningCooldowns: {},
    summaryCounters: createDefaultCounters(),
  };
}

function parsePatterns(value: unknown): RuntimePatternDetectionResult[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as RuntimePatternDetectionResult[];
}

function parseRecommendations(value: unknown): RuntimePreventionRecommendationClass[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === "string") as RuntimePreventionRecommendationClass[];
}

function parseState(value: unknown): RuntimeLearningStateSurface | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "rgpt.runtime_repair_learning_state.v1") {
    return null;
  }
  if (typeof record.runtimeId !== "string" || typeof record.lastUpdatedAt !== "string") {
    return null;
  }

  const summary =
    record.summaryCounters && typeof record.summaryCounters === "object" && !Array.isArray(record.summaryCounters)
      ? (record.summaryCounters as RuntimeLearningCounters)
      : createDefaultCounters();

  return {
    schemaVersion: "rgpt.runtime_repair_learning_state.v1",
    runtimeId: record.runtimeId,
    status: (typeof record.status === "string" ? record.status : "idle") as RuntimeLearningStatus,
    lastUpdatedAt: record.lastUpdatedAt,
    latestLearningResult:
      record.latestLearningResult && typeof record.latestLearningResult === "object" && !Array.isArray(record.latestLearningResult)
        ? (record.latestLearningResult as RuntimeLearningStateSurface["latestLearningResult"])
        : null,
    recentPatterns: parsePatterns(record.recentPatterns),
    recentRecommendations: parseRecommendations(record.recentRecommendations),
    recurrenceCounters:
      record.recurrenceCounters && typeof record.recurrenceCounters === "object" && !Array.isArray(record.recurrenceCounters)
        ? (record.recurrenceCounters as Record<string, number>)
        : {},
    learningCooldowns:
      record.learningCooldowns && typeof record.learningCooldowns === "object" && !Array.isArray(record.learningCooldowns)
        ? (record.learningCooldowns as Record<string, string>)
        : {},
    summaryCounters: {
      totalAnalyses: Number(summary.totalAnalyses) || 0,
      totalCompleted: Number(summary.totalCompleted) || 0,
      totalSkipped: Number(summary.totalSkipped) || 0,
      totalRecurrencesDetected: Number(summary.totalRecurrencesDetected) || 0,
      totalRootCausesIdentified: Number(summary.totalRootCausesIdentified) || 0,
      totalRecommendationsGenerated: Number(summary.totalRecommendationsGenerated) || 0,
    },
  };
}

export class RuntimeRepairLearningStateRepository {
  constructor(private readonly statePath: string) {}

  async read(runtimeId: string, nowIso: string): Promise<RuntimeLearningStateSurface> {
    try {
      const raw = await readFile(this.statePath, "utf8");
      const parsed = parseState(JSON.parse(raw));
      if (!parsed) {
        return createInitialRuntimeLearningState(runtimeId, nowIso);
      }
      return parsed;
    } catch {
      return createInitialRuntimeLearningState(runtimeId, nowIso);
    }
  }

  async write(state: RuntimeLearningStateSurface): Promise<void> {
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
}
