import type {
  RuntimeActiveContainmentEntry,
  RuntimeContainmentStateSurface,
} from "./runtime-containment.types";

function keyOf(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function appendHistory(
  state: RuntimeContainmentStateSurface,
  entry: RuntimeActiveContainmentEntry,
  eventAt: string,
  reasonCodes: string[]
): void {
  const key = keyOf(entry.targetType, entry.targetId);
  const list = state.perTargetContainmentHistory[key] ?? [];
  const next = [
    ...list,
    {
      eventAt,
      status: entry.status,
      containmentAction: entry.containmentAction,
      triggerCategory: entry.triggerCategory,
      reasonCodes,
    },
  ];
  state.perTargetContainmentHistory[key] = next.slice(-50);
}

export interface ReintegrationProgressInput {
  now: Date;
  observationMs: number;
  maxReintegrationFailures: number;
  repairAttemptId?: string;
  repairSuccess?: boolean;
  validationId?: string;
  validationSuccess?: boolean;
  recurringAnomalyDetected: boolean;
}

export interface ReintegrationProgressResult {
  events: Array<
    | "runtime_reintegration_started"
    | "runtime_reintegration_observation_started"
    | "runtime_reintegration_completed"
    | "runtime_reintegration_failed"
    | "runtime_target_retired_from_auto_reintegration"
  >;
  updatedEntry: RuntimeActiveContainmentEntry;
  reasonCodes: string[];
}

export class RuntimeReintegrationController {
  progress(
    state: RuntimeContainmentStateSurface,
    entry: RuntimeActiveContainmentEntry,
    input: ReintegrationProgressInput
  ): ReintegrationProgressResult | null {
    const nowIso = input.now.toISOString();
    const reasonCodes: string[] = [];
    const events: ReintegrationProgressResult["events"] = [];

    let updated = entry;

    if (updated.status === "contained" && input.repairSuccess) {
      updated = {
        ...updated,
        status: "under_repair",
        updatedAt: nowIso,
        repairCorrelationId: input.repairAttemptId ?? updated.repairCorrelationId,
      };
      reasonCodes.push("REINTEGRATION_STARTED_AFTER_REPAIR_SUCCESS");
      events.push("runtime_reintegration_started");
    }

    if ((updated.status === "contained" || updated.status === "under_repair") && input.validationSuccess) {
      updated = {
        ...updated,
        status: "recovery_validation",
        updatedAt: nowIso,
        validationCorrelationId: input.validationId ?? updated.validationCorrelationId,
      };

      updated = {
        ...updated,
        status: "observation",
        updatedAt: nowIso,
        observationUntil: new Date(input.now.getTime() + input.observationMs).toISOString(),
      };
      state.observationWindows[keyOf(updated.targetType, updated.targetId)] = updated.observationUntil ?? nowIso;
      reasonCodes.push("REINTEGRATION_OBSERVATION_STARTED");
      events.push("runtime_reintegration_observation_started");
    }

    if (updated.status === "observation") {
      const observationUntilMs = updated.observationUntil ? Date.parse(updated.observationUntil) : Number.NaN;
      if (input.recurringAnomalyDetected) {
        const failures = updated.reintegrationFailures + 1;
        const retired = failures >= input.maxReintegrationFailures;
        updated = {
          ...updated,
          status: retired ? "retired" : "contained",
          updatedAt: nowIso,
          reintegrationFailures: failures,
          observationUntil: null,
        };
        delete state.observationWindows[keyOf(updated.targetType, updated.targetId)];
        reasonCodes.push("REINTEGRATION_FAILED_RECURRING_ANOMALY");
        events.push("runtime_reintegration_failed");
        if (retired) {
          reasonCodes.push("TARGET_RETIRED_AFTER_REINTEGRATION_FAILURES");
          events.push("runtime_target_retired_from_auto_reintegration");
        }
      } else if (Number.isFinite(observationUntilMs) && input.now.getTime() >= observationUntilMs) {
        updated = {
          ...updated,
          status: "reintegrated",
          updatedAt: nowIso,
          observationUntil: null,
        };
        delete state.observationWindows[keyOf(updated.targetType, updated.targetId)];
        reasonCodes.push("REINTEGRATION_COMPLETED_AFTER_OBSERVATION");
        events.push("runtime_reintegration_completed");
      }
    }

    if (events.length === 0) {
      return null;
    }

    const index = state.activeContainments.findIndex(
      (item) => item.targetType === entry.targetType && item.targetId === entry.targetId
    );
    if (index >= 0) {
      state.activeContainments[index] = updated;
    }

    appendHistory(state, updated, nowIso, reasonCodes);

    return {
      events,
      updatedEntry: updated,
      reasonCodes,
    };
  }
}
