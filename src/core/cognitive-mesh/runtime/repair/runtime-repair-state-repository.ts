import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  RuntimeRepairCooldownEntry,
  RuntimeRepairStateSurface,
  RuntimeRepairStatus,
  RuntimeRepairSummaryCounters,
} from "./runtime-repair.types";

function createDefaultCounters(): RuntimeRepairSummaryCounters {
  return {
    totalDiagnoses: 0,
    totalRepairsAttempted: 0,
    totalRepairsSucceeded: 0,
    totalRepairsFailed: 0,
    totalRepairsSkipped: 0,
    totalValidationsSucceeded: 0,
    totalValidationsFailed: 0,
    totalCooldownSkips: 0,
  };
}

function parseState(value: unknown): RuntimeRepairStateSurface | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "rgpt.runtime_repair_state.v1") {
    return null;
  }
  if (typeof record.runtimeId !== "string") {
    return null;
  }
  if (typeof record.lastUpdatedAt !== "string") {
    return null;
  }
  const status = typeof record.status === "string" ? (record.status as RuntimeRepairStatus) : "idle";
  const summary =
    record.summaryCounters && typeof record.summaryCounters === "object" && !Array.isArray(record.summaryCounters)
      ? (record.summaryCounters as RuntimeRepairSummaryCounters)
      : createDefaultCounters();
  const cooldownsRaw =
    record.perTargetCooldowns && typeof record.perTargetCooldowns === "object" && !Array.isArray(record.perTargetCooldowns)
      ? (record.perTargetCooldowns as Record<string, RuntimeRepairCooldownEntry>)
      : {};

  return {
    schemaVersion: "rgpt.runtime_repair_state.v1",
    runtimeId: record.runtimeId,
    status,
    lastUpdatedAt: record.lastUpdatedAt,
    latestDiagnosis:
      record.latestDiagnosis && typeof record.latestDiagnosis === "object" && !Array.isArray(record.latestDiagnosis)
        ? (record.latestDiagnosis as RuntimeRepairStateSurface["latestDiagnosis"])
        : null,
    latestRepairAttempt:
      record.latestRepairAttempt && typeof record.latestRepairAttempt === "object" && !Array.isArray(record.latestRepairAttempt)
        ? (record.latestRepairAttempt as RuntimeRepairStateSurface["latestRepairAttempt"])
        : null,
    latestValidation:
      record.latestValidation && typeof record.latestValidation === "object" && !Array.isArray(record.latestValidation)
        ? (record.latestValidation as RuntimeRepairStateSurface["latestValidation"])
        : null,
    perTargetCooldowns: { ...cooldownsRaw },
    summaryCounters: {
      totalDiagnoses: Number(summary.totalDiagnoses) || 0,
      totalRepairsAttempted: Number(summary.totalRepairsAttempted) || 0,
      totalRepairsSucceeded: Number(summary.totalRepairsSucceeded) || 0,
      totalRepairsFailed: Number(summary.totalRepairsFailed) || 0,
      totalRepairsSkipped: Number(summary.totalRepairsSkipped) || 0,
      totalValidationsSucceeded: Number(summary.totalValidationsSucceeded) || 0,
      totalValidationsFailed: Number(summary.totalValidationsFailed) || 0,
      totalCooldownSkips: Number(summary.totalCooldownSkips) || 0,
    },
  };
}

export function createInitialRuntimeRepairState(runtimeId: string, nowIso: string): RuntimeRepairStateSurface {
  return {
    schemaVersion: "rgpt.runtime_repair_state.v1",
    runtimeId,
    status: "idle",
    lastUpdatedAt: nowIso,
    latestDiagnosis: null,
    latestRepairAttempt: null,
    latestValidation: null,
    perTargetCooldowns: {},
    summaryCounters: createDefaultCounters(),
  };
}

export class RuntimeRepairStateRepository {
  constructor(private readonly statePath: string) {}

  async read(runtimeId: string, nowIso: string): Promise<RuntimeRepairStateSurface> {
    try {
      const text = await readFile(this.statePath, "utf8");
      const parsed = parseState(JSON.parse(text));
      if (!parsed) {
        return createInitialRuntimeRepairState(runtimeId, nowIso);
      }
      return parsed;
    } catch {
      return createInitialRuntimeRepairState(runtimeId, nowIso);
    }
  }

  async write(state: RuntimeRepairStateSurface): Promise<void> {
    await mkdir(dirname(this.statePath), { recursive: true });
    await writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }
}
