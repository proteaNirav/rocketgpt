import { createHash } from "node:crypto";
import type { ExecutionLedger } from "../execution-ledger";
import type { RuntimeLearningEventInput } from "./runtime-repair-learning.types";

function createExecutionId(runtimeId: string, eventType: string, timestamp: string): string {
  const token = createHash("sha256").update(`${runtimeId}:${eventType}:${timestamp}`).digest("hex").slice(0, 16);
  return `runtime_learning_${token}`;
}

export function emitRuntimeLearningLedgerEvent(ledger: ExecutionLedger, input: RuntimeLearningEventInput): void {
  const timestamp = input.learningResult?.analyzedAt ?? new Date().toISOString();

  ledger.append({
    category: "runtime",
    eventType: input.eventType,
    action: input.eventType,
    source: "runtime_repair_learning_orchestrator",
    target: input.learningResult?.targetId ?? input.learningResult?.targetType ?? "runtime",
    ids: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      correlationId: input.requestId,
      executionId: createExecutionId(input.runtimeId, input.eventType, timestamp),
    },
    mode: input.status === "degraded" ? "degraded" : "normal",
    status: input.status,
    metadata: {
      targetType: input.learningResult?.targetType,
      targetId: input.learningResult?.targetId,
      anomalyType: input.learningResult?.anomalyType,
      repairAction: input.learningResult?.repairAction,
      validationOutcome: input.learningResult?.validationOutcome,
      patternCategory: input.learningResult?.patternCategory,
      rootCauseCategory: input.learningResult?.rootCauseCategory,
      recommendationClasses: input.learningResult?.recommendationClasses,
      recurrenceCount: input.learningResult?.recurrenceCount,
      confidence: input.learningResult?.confidence,
      reasonCodes: input.reasonCodes,
      learningId: input.learningResult?.learningId,
      sourceEventIds: input.learningResult?.sourceEventIds,
    },
  });
}
