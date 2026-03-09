import { runRuntimeRepairLearningCycle } from "./repair-learning/runtime-repair-learning-orchestrator";
import type { RuntimeRepairAnomalyType, RuntimeRepairAction } from "./repair/runtime-repair.types";
import type { RuntimeLearningInput } from "./repair-learning/runtime-repair-learning.types";

interface CliOptions {
  runtimeId?: string;
  anomalyType?: RuntimeRepairAnomalyType;
  repairAction?: RuntimeRepairAction;
  targetId?: string;
  validationOutcome?: "succeeded" | "failed" | "unknown";
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--runtime-id") {
      options.runtimeId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--anomaly-type") {
      options.anomalyType = argv[i + 1] as RuntimeRepairAnomalyType;
      i += 1;
      continue;
    }
    if (arg === "--repair-action") {
      options.repairAction = argv[i + 1] as RuntimeRepairAction;
      i += 1;
      continue;
    }
    if (arg === "--target-id") {
      options.targetId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--validation-outcome") {
      options.validationOutcome = argv[i + 1] as "succeeded" | "failed" | "unknown";
      i += 1;
    }
  }
  return options;
}

async function maybeBuildInlineInput(options: CliOptions): Promise<RuntimeLearningInput> {
  if (!options.anomalyType || !options.repairAction) {
    return {};
  }

  const nowIso = new Date().toISOString();
  const validationSuccess = options.validationOutcome === "succeeded" ? true : options.validationOutcome === "failed" ? false : true;

  return {
    runtimeId: options.runtimeId,
    diagnosis: {
      diagnosisId: `diag_inline_${Date.now()}`,
      detectedAt: nowIso,
      source: "runtime_repair_learning_cli_inline",
      anomalyType: options.anomalyType,
      severity: "medium",
      repairable: true,
      likelyTargetType:
        options.anomalyType === "queue_backlog"
          ? "queue"
          : options.anomalyType === "memory_pressure"
            ? "memory"
            : options.anomalyType === "capability_timeout" || options.anomalyType === "capability_lock_stuck"
              ? "capability"
              : "runtime",
      likelyTargetId: options.targetId ?? null,
      recommendedRepairAction: options.repairAction,
      reasonCodes: ["INLINE_INPUT"],
      metadata: {},
    },
    repairAttempt: {
      attemptId: `attempt_inline_${Date.now()}`,
      startedAt: nowIso,
      completedAt: nowIso,
      targetType:
        options.anomalyType === "queue_backlog"
          ? "queue"
          : options.anomalyType === "memory_pressure"
            ? "memory"
            : options.anomalyType === "capability_timeout" || options.anomalyType === "capability_lock_stuck"
              ? "capability"
              : "runtime",
      targetId: options.targetId ?? null,
      anomalyType: options.anomalyType,
      repairAction: options.repairAction,
      success: true,
      reasonCodes: ["INLINE_ATTEMPT"],
      metadata: {},
    },
    validation: {
      validationId: `val_inline_${Date.now()}`,
      startedAt: nowIso,
      completedAt: nowIso,
      targetType:
        options.anomalyType === "queue_backlog"
          ? "queue"
          : options.anomalyType === "memory_pressure"
            ? "memory"
            : options.anomalyType === "capability_timeout" || options.anomalyType === "capability_lock_stuck"
              ? "capability"
              : "runtime",
      targetId: options.targetId ?? null,
      repairAction: options.repairAction,
      success: validationSuccess,
      checks: [{ checkId: "inline", success: validationSuccess, detail: "inline validation" }],
      reasonCodes: ["INLINE_VALIDATION"],
      metadata: {},
    },
  };
}

async function main(): Promise<void> {
  const runtimeProcess = process as unknown as {
    argv: string[];
    stdout: { write: (text: string) => void };
  };
  const options = parseCliOptions(runtimeProcess.argv.slice(2));

  const input = await maybeBuildInlineInput(options);
  const result = await runRuntimeRepairLearningCycle({
    ...input,
    runtimeId: options.runtimeId ?? input.runtimeId,
    env: process.env,
  });

  runtimeProcess.stdout.write(
    `${JSON.stringify(
      {
        status: result.status,
        skipped: result.skipped,
        cooldownActive: result.cooldownActive,
        learningResult: result.learningResult,
        reasonCodes: result.reasonCodes,
      },
      null,
      2
    )}\n`
  );
}

void main();
