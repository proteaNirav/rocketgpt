import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import type {
  RuntimeRecoveryValidation,
  RuntimeRecoveryValidationCheck,
  RuntimeRepairAttempt,
  RuntimeRepairConfig,
  RuntimeRepairDiagnosis,
} from "./runtime-repair.types";

export interface RecoveryValidatorInput {
  now: Date;
  diagnosis: RuntimeRepairDiagnosis;
  attempt: RuntimeRepairAttempt;
  config: RuntimeRepairConfig;
  runtimeId: string;
  heartbeatState?: "healthy" | "degraded" | "blocked" | "stale" | "failed" | "unknown";
}

function hashId(prefix: string, value: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

async function fileExistsAndRecent(path: string, thresholdMs: number, nowMs: number): Promise<boolean> {
  try {
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const ts = typeof parsed.updatedAt === "string"
      ? parsed.updatedAt
      : typeof parsed.restartSignalAt === "string"
        ? parsed.restartSignalAt
        : typeof parsed.recoveredAt === "string"
          ? parsed.recoveredAt
          : typeof parsed.cleanedAt === "string"
            ? parsed.cleanedAt
            : typeof parsed.lastResetAt === "string"
              ? parsed.lastResetAt
              : null;
    if (!ts) {
      return false;
    }
    const epoch = Date.parse(ts);
    return Number.isFinite(epoch) && nowMs - epoch <= thresholdMs;
  } catch {
    return false;
  }
}

async function validateMemoryCleanup(path: string): Promise<boolean> {
  try {
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries : null;
    return entries !== null && entries.length === 0;
  } catch {
    return false;
  }
}

async function validateCapabilityUnlocked(path: string, targetId: string): Promise<boolean> {
  try {
    const text = await readFile(path, "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const capabilities = parsed.capabilities;
    if (!capabilities || typeof capabilities !== "object" || Array.isArray(capabilities)) {
      return false;
    }
    const item = (capabilities as Record<string, unknown>)[targetId];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return false;
    }
    return (item as Record<string, unknown>).locked === false;
  } catch {
    return false;
  }
}

export class RecoveryValidator {
  async validate(input: RecoveryValidatorInput): Promise<RuntimeRecoveryValidation> {
    const startedAt = input.now.toISOString();
    const nowMs = input.now.getTime();
    const checks: RuntimeRecoveryValidationCheck[] = [];
    const thresholdMs = input.config.validationWindowMs;

    if (input.attempt.repairAction === "restart_runtime_worker") {
      checks.push({
        checkId: "restart_signal_recent",
        success: await fileExistsAndRecent(input.config.restartStatePath, thresholdMs, nowMs),
        detail: "restart signal was written within validation window",
      });
      checks.push({
        checkId: "heartbeat_progress",
        success: input.heartbeatState === undefined ? true : input.heartbeatState !== "stale",
        detail: "heartbeat should no longer be stale when post-repair signal is available",
      });
    } else if (input.attempt.repairAction === "recover_queue") {
      checks.push({
        checkId: "queue_recovery_marker_recent",
        success: await fileExistsAndRecent(input.config.queueRecoveryStatePath, thresholdMs, nowMs),
        detail: "queue recovery marker was updated",
      });
    } else if (input.attempt.repairAction === "cleanup_memory") {
      checks.push({
        checkId: "transient_memory_empty",
        success: await validateMemoryCleanup(input.config.transientMemoryPath),
        detail: "transient memory cache entries should be empty",
      });
    } else if (input.attempt.repairAction === "reset_capability_state") {
      const targetId = input.attempt.targetId ?? "capability_unknown";
      checks.push({
        checkId: "capability_unlocked",
        success: await validateCapabilityUnlocked(input.config.capabilityRuntimeStatePath, targetId),
        detail: "capability runtime state lock should be cleared",
      });
    } else {
      checks.push({
        checkId: "no_action_required",
        success: true,
        detail: "no action selected; validation treated as pass",
      });
    }

    const success = checks.every((check) => check.success);
    const completedAt = new Date(input.now.getTime() + 1).toISOString();
    const reasonCodes = success ? ["VALIDATION_PASSED"] : ["VALIDATION_FAILED"];

    return {
      validationId: hashId("val", {
        diagnosisId: input.diagnosis.diagnosisId,
        attemptId: input.attempt.attemptId,
        startedAt,
      }),
      startedAt,
      completedAt,
      targetType: input.diagnosis.likelyTargetType,
      targetId: input.diagnosis.likelyTargetId,
      repairAction: input.attempt.repairAction,
      success,
      checks,
      reasonCodes,
      metadata: {
        runtimeId: input.runtimeId,
      },
    };
  }
}
