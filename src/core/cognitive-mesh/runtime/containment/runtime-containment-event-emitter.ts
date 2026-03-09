import { createHash } from "node:crypto";
import type { ExecutionLedger } from "../execution-ledger";
import type { RuntimeContainmentEventInput } from "./runtime-containment.types";

function createExecutionId(runtimeId: string, eventType: string, timestamp: string): string {
  const token = createHash("sha256").update(`${runtimeId}:${eventType}:${timestamp}`).digest("hex").slice(0, 16);
  return `runtime_containment_${token}`;
}

export function emitRuntimeContainmentLedgerEvent(ledger: ExecutionLedger, input: RuntimeContainmentEventInput): void {
  const timestamp =
    input.decision?.decidedAt ??
    input.activeContainment?.updatedAt ??
    input.activeContainment?.startedAt ??
    new Date().toISOString();

  const targetType = input.decision?.targetType ?? input.activeContainment?.targetType ?? "worker";
  const targetId = input.decision?.targetId ?? input.activeContainment?.targetId ?? "unknown";
  const action = input.decision?.containmentAction ?? input.activeContainment?.containmentAction ?? "no_containment";

  ledger.append({
    category: "runtime",
    eventType: input.eventType,
    action: input.eventType,
    source: "runtime_containment_orchestrator",
    target: targetId,
    ids: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      correlationId: input.requestId,
      executionId: createExecutionId(input.runtimeId, input.eventType, timestamp),
    },
    mode: input.status === "degraded" ? "degraded" : "normal",
    status: input.status,
    metadata: {
      targetType,
      targetId,
      containmentAction: action,
      triggerCategory: input.decision?.triggerCategory ?? input.activeContainment?.triggerCategory,
      status: input.activeContainment?.status,
      riskLevel: input.decision?.riskLevel ?? input.activeContainment?.riskLevel,
      reasonCodes: input.reasonCodes,
      containmentDecisionId: input.decision?.containmentDecisionId,
      repairCorrelationId: input.activeContainment?.repairCorrelationId,
      validationCorrelationId: input.activeContainment?.validationCorrelationId,
      observationUntil: input.activeContainment?.observationUntil,
    },
  });
}
