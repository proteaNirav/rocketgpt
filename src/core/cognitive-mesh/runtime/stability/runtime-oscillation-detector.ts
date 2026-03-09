import type {
  RuntimeInstabilityPattern,
  RuntimeStabilitySignal,
} from "./runtime-stability.types";

export interface RuntimeOscillationDetectorInput {
  signals: RuntimeStabilitySignal[];
  oscillationThreshold: number;
  lookbackMs: number;
  now: Date;
}

export interface RuntimeOscillationDetectorResult {
  patterns: RuntimeInstabilityPattern[];
  oscillatingTargets: Set<string>;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

function keyOf(signal: RuntimeStabilitySignal): string {
  return `${signal.targetType}:${signal.targetId}`;
}

export class RuntimeOscillationDetector {
  detect(input: RuntimeOscillationDetectorInput): RuntimeOscillationDetectorResult {
    const reasonCodes: string[] = [];
    const patterns = new Set<RuntimeInstabilityPattern>();
    const oscillatingTargets = new Set<string>();

    const byTarget = new Map<string, RuntimeStabilitySignal[]>();
    for (const signal of input.signals) {
      const key = keyOf(signal);
      const list = byTarget.get(key) ?? [];
      list.push(signal);
      byTarget.set(key, list);
    }

    let multiTargetUnstable = 0;

    for (const [target, list] of byTarget.entries()) {
      const sorted = [...list].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const repairAttempts = sorted.filter((item) => item.eventType === "runtime_repair_attempted").length;
      const repairFailures = sorted.filter((item) => item.eventType === "runtime_repair_failed").length;
      const validationFailures = sorted.filter((item) => item.eventType === "runtime_recovery_validation_failed").length;
      const reintegrationFailures = sorted.filter((item) => item.eventType === "runtime_reintegration_failed").length;
      const recontainedAfterReintegration = sorted.filter((item) => item.eventType === "runtime_quarantine_applied").length;

      if (repairAttempts >= input.oscillationThreshold && repairFailures >= Math.max(1, input.oscillationThreshold - 1)) {
        patterns.add("repair_oscillation");
        oscillatingTargets.add(target);
        reasonCodes.push(`REPAIR_OSCILLATION_${target}`);
      }

      if (reintegrationFailures >= input.oscillationThreshold && recontainedAfterReintegration >= input.oscillationThreshold) {
        patterns.add("contain_reintegrate_oscillation");
        patterns.add("instability_after_reintegration");
        oscillatingTargets.add(target);
        reasonCodes.push(`CONTAIN_REINTEGRATE_OSCILLATION_${target}`);
      }

      if (validationFailures >= input.oscillationThreshold) {
        patterns.add("repeated_validation_failure");
        oscillatingTargets.add(target);
        reasonCodes.push(`REPEATED_VALIDATION_FAILURE_${target}`);
      }

      if (repairFailures >= input.oscillationThreshold) {
        patterns.add("repeated_repair_failure");
        oscillatingTargets.add(target);
        reasonCodes.push(`REPEATED_REPAIR_FAILURE_${target}`);
      }

      const heartbeatFlap = sorted.filter((item) => item.eventType === "runtime.heartbeat").length;
      if (heartbeatFlap >= input.oscillationThreshold + 1) {
        patterns.add("heartbeat_recovery_flap");
        oscillatingTargets.add(target);
        reasonCodes.push(`HEARTBEAT_FLAP_${target}`);
      }

      const instabilityEvents = sorted.filter((item) =>
        item.eventType === "runtime_repair_failed" ||
        item.eventType === "runtime_recovery_validation_failed" ||
        item.eventType === "runtime_quarantine_applied" ||
        item.eventType === "runtime_reintegration_failed"
      ).length;
      if (instabilityEvents >= input.oscillationThreshold) {
        patterns.add("repeated_same_target_instability");
        multiTargetUnstable += 1;
        reasonCodes.push(`REPEATED_SAME_TARGET_INSTABILITY_${target}`);
      }
    }

    if (multiTargetUnstable >= input.oscillationThreshold) {
      patterns.add("clustered_multi_target_instability");
      reasonCodes.push("CLUSTERED_MULTI_TARGET_INSTABILITY");
    }

    return {
      patterns: [...patterns],
      oscillatingTargets,
      reasonCodes,
      metadata: {
        targetCount: byTarget.size,
        multiTargetUnstable,
      },
    };
  }
}
