import type {
  RuntimeActiveContainmentEntry,
  RuntimeContainmentAction,
  RuntimeContainmentDecision,
  RuntimeContainmentStateSurface,
} from "./runtime-containment.types";

function targetKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`;
}

function appendHistory(
  state: RuntimeContainmentStateSurface,
  entry: RuntimeActiveContainmentEntry,
  eventAt: string,
  reasonCodes: string[]
): void {
  const key = targetKey(entry.targetType, entry.targetId);
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

export class RuntimeQuarantineController {
  applyDecision(state: RuntimeContainmentStateSurface, decision: RuntimeContainmentDecision, nowIso: string): {
    applied: boolean;
    extended: boolean;
    entry: RuntimeActiveContainmentEntry | null;
    reasonCodes: string[];
  } {
    if (!decision.shouldContain || decision.containmentAction === "no_containment") {
      return {
        applied: false,
        extended: false,
        entry: null,
        reasonCodes: ["QUARANTINE_NOT_APPLIED"],
      };
    }

    const index = state.activeContainments.findIndex(
      (item) => item.targetType === decision.targetType && item.targetId === decision.targetId
    );

    if (index >= 0) {
      const current = state.activeContainments[index]!;
      const extended: RuntimeActiveContainmentEntry = {
        ...current,
        containmentAction: decision.containmentAction,
        status: current.status === "retired" ? "retired" : "contained",
        triggerCategory: decision.triggerCategory,
        riskLevel: decision.riskLevel,
        updatedAt: nowIso,
        reasonCodes: [...new Set([...current.reasonCodes, ...decision.reasonCodes])],
        metadata: {
          ...current.metadata,
          ...decision.metadata,
          extendedAt: nowIso,
        },
      };
      state.activeContainments[index] = extended;
      appendHistory(state, extended, nowIso, ["QUARANTINE_EXTENDED", ...decision.reasonCodes]);
      return {
        applied: true,
        extended: true,
        entry: extended,
        reasonCodes: ["QUARANTINE_EXTENDED", ...decision.reasonCodes],
      };
    }

    const entry: RuntimeActiveContainmentEntry = {
      targetType: decision.targetType,
      targetId: decision.targetId,
      containmentAction: decision.containmentAction,
      status: "contained",
      triggerCategory: decision.triggerCategory,
      riskLevel: decision.riskLevel,
      startedAt: nowIso,
      updatedAt: nowIso,
      repairCorrelationId: null,
      validationCorrelationId: null,
      observationUntil: null,
      reintegrationFailures: 0,
      reasonCodes: [...decision.reasonCodes],
      metadata: {
        ...decision.metadata,
      },
    };
    state.activeContainments.push(entry);
    appendHistory(state, entry, nowIso, ["QUARANTINE_APPLIED", ...decision.reasonCodes]);
    return {
      applied: true,
      extended: false,
      entry,
      reasonCodes: ["QUARANTINE_APPLIED", ...decision.reasonCodes],
    };
  }

  selectActionByTargetType(targetType: RuntimeActiveContainmentEntry["targetType"]): RuntimeContainmentAction {
    if (targetType === "queue") {
      return "freeze_queue";
    }
    if (targetType === "capability") {
      return "quarantine_capability";
    }
    return "quarantine_worker";
  }
}
