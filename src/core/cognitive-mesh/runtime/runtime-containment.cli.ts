import { runRuntimeContainmentCycle } from "./containment/runtime-containment-orchestrator";
import type { RuntimeRepairAnomalyType } from "./repair/runtime-repair.types";
import type { RuntimeContainmentTargetType } from "./containment/runtime-containment.types";

interface CliOptions {
  runtimeId?: string;
  anomalyType?: RuntimeRepairAnomalyType;
  targetType?: RuntimeContainmentTargetType;
  targetId?: string;
  learningEscalate: boolean;
  repairFailed: boolean;
  validationFailed: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    learningEscalate: false,
    repairFailed: false,
    validationFailed: false,
  };

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
    if (arg === "--target-type") {
      options.targetType = argv[i + 1] as RuntimeContainmentTargetType;
      i += 1;
      continue;
    }
    if (arg === "--target-id") {
      options.targetId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--learning-escalate") {
      options.learningEscalate = true;
      continue;
    }
    if (arg === "--repair-failed") {
      options.repairFailed = true;
      continue;
    }
    if (arg === "--validation-failed") {
      options.validationFailed = true;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const runtimeProcess = process as unknown as {
    argv: string[];
    stdout: { write: (text: string) => void };
  };

  const options = parseArgs(runtimeProcess.argv.slice(2));
  const nowIso = new Date().toISOString();

  const result = await runRuntimeContainmentCycle({
    runtimeId: options.runtimeId,
    anomalyType: options.anomalyType,
    targetType: options.targetType,
    targetId: options.targetId,
    repairAttempt: options.repairFailed
      ? {
          attemptId: `attempt_inline_${Date.now()}`,
          startedAt: nowIso,
          completedAt: nowIso,
          targetType: options.targetType === "queue" ? "queue" : options.targetType === "capability" ? "capability" : "worker",
          targetId: options.targetId ?? "inline-target",
          anomalyType: options.anomalyType ?? "unsupported",
          repairAction:
            options.targetType === "queue"
              ? "recover_queue"
              : options.targetType === "capability"
                ? "reset_capability_state"
                : "restart_runtime_worker",
          success: false,
          reasonCodes: ["INLINE_REPAIR_FAILED"],
          metadata: {},
        }
      : undefined,
    validation: options.validationFailed
      ? {
          validationId: `validation_inline_${Date.now()}`,
          startedAt: nowIso,
          completedAt: nowIso,
          targetType: options.targetType === "queue" ? "queue" : options.targetType === "capability" ? "capability" : "runtime",
          targetId: options.targetId ?? "inline-target",
          repairAction:
            options.targetType === "queue"
              ? "recover_queue"
              : options.targetType === "capability"
                ? "reset_capability_state"
                : "restart_runtime_worker",
          success: false,
          checks: [{ checkId: "inline", success: false, detail: "inline validation fail" }],
          reasonCodes: ["INLINE_VALIDATION_FAILED"],
          metadata: {},
        }
      : undefined,
    learningResult: options.learningEscalate
      ? {
          learningId: `learning_inline_${Date.now()}`,
          analyzedAt: nowIso,
          sourceEventIds: [],
          targetType: options.targetType === "queue" ? "queue" : options.targetType === "capability" ? "capability" : "runtime",
          targetId: options.targetId ?? "inline-target",
          anomalyType: options.anomalyType ?? "unsupported",
          repairAction:
            options.targetType === "queue"
              ? "recover_queue"
              : options.targetType === "capability"
                ? "reset_capability_state"
                : "restart_runtime_worker",
          validationOutcome: "failed",
          patternCategory: "clustered_failures_same_target",
          recurrenceDetected: true,
          recurrenceCount: 2,
          rootCauseCategory: "unknown_but_recurrent",
          confidence: "medium",
          recommendationClasses: ["escalate_for_containment_consideration"],
          reasonCodes: ["INLINE_LEARNING_ESCALATION"],
          metadata: {},
        }
      : undefined,
    env: process.env,
  });

  runtimeProcess.stdout.write(
    `${JSON.stringify(
      {
        decision: result.decision,
        activeContainment: result.activeContainment,
        skipped: result.skipped,
        cooldownActive: result.cooldownActive,
        reasonCodes: result.reasonCodes,
      },
      null,
      2
    )}\n`
  );
}

void main();
