import { createHash } from "node:crypto";
import type { ExecutionLedger } from "../execution-ledger";
import type { RuntimeRepairEventInput } from "./runtime-repair.types";

function createExecutionId(runtimeId: string, eventType: string, timestamp: string): string {
  const token = createHash("sha256").update(`${runtimeId}:${eventType}:${timestamp}`).digest("hex").slice(0, 16);
  return `runtime_repair_${token}`;
}

export function emitRuntimeRepairLedgerEvent(ledger: ExecutionLedger, input: RuntimeRepairEventInput): void {
  const timestamp = input.attempt?.startedAt ?? input.diagnosis?.detectedAt ?? input.validation?.startedAt ?? new Date().toISOString();
  const targetType = input.diagnosis?.likelyTargetType ?? input.attempt?.targetType ?? input.validation?.targetType ?? "runtime";
  const targetId = input.diagnosis?.likelyTargetId ?? input.attempt?.targetId ?? input.validation?.targetId ?? null;
  const anomalyType = input.diagnosis?.anomalyType ?? null;
  const repairAction = input.diagnosis?.recommendedRepairAction ?? input.attempt?.repairAction ?? input.validation?.repairAction ?? "no_action";

  ledger.append({
    category: "runtime",
    eventType: input.eventType,
    action: input.eventType,
    source: "runtime_repair_orchestrator",
    target: targetId ?? targetType,
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
      anomalyType,
      repairAction,
      reasonCodes: input.reasonCodes,
      diagnosisId: input.diagnosis?.diagnosisId,
      attemptId: input.attempt?.attemptId,
      validationId: input.validation?.validationId,
      outcome: input.validation ? (input.validation.success ? "validation_succeeded" : "validation_failed") : undefined,
    },
  });
}
