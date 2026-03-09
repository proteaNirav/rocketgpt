import { createHash } from "node:crypto";
import type { ExecutionLedger } from "../execution-ledger";
import type { RuntimeEvolutionSignalsEventInput } from "./runtime-evolution-signals.types";

function createExecutionId(runtimeId: string, eventType: string, timestamp: string): string {
  const token = createHash("sha256").update(`${runtimeId}:${eventType}:${timestamp}`).digest("hex").slice(0, 16);
  return `runtime_evolution_${token}`;
}

export function emitRuntimeEvolutionSignalsLedgerEvent(ledger: ExecutionLedger, input: RuntimeEvolutionSignalsEventInput): void {
  const timestamp =
    input.evaluation?.evaluatedAt ??
    input.healingTelemetry?.analyzedAt ??
    input.learningSignal?.capturedAt ??
    input.improvementCandidate?.detectedAt ??
    new Date().toISOString();

  ledger.append({
    category: "runtime",
    eventType: input.eventType,
    action: input.eventType,
    source: "runtime_evolution_signals_orchestrator",
    target:
      input.learningSignal?.targetId ??
      input.improvementCandidate?.targetId ??
      input.healingTelemetry?.targetId ??
      input.evaluation?.summary.healingAssessment ??
      "runtime",
    ids: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      correlationId: input.requestId,
      executionId: createExecutionId(input.runtimeId, input.eventType, timestamp),
    },
    mode: input.status === "degraded" ? "degraded" : "normal",
    status: input.status,
    metadata: {
      healthAssessment: input.healingTelemetry?.healthAssessment ?? input.evaluation?.summary.healingAssessment,
      targetType: input.learningSignal?.targetType ?? input.improvementCandidate?.targetType ?? input.healingTelemetry?.targetType,
      targetId: input.learningSignal?.targetId ?? input.improvementCandidate?.targetId ?? input.healingTelemetry?.targetId,
      category: input.improvementCandidate?.category,
      severity: input.improvementCandidate?.severity,
      recurrenceCount: input.improvementCandidate?.recurrenceCount,
      decisionTaken: input.learningSignal?.decisionTaken,
      learningOutcome: input.learningSignal?.outcome,
      stabilityImpact: input.learningSignal?.stabilityImpact,
      systemStabilityBand: input.evaluation?.healingTelemetry.healthAssessment,
      reasonCodes: input.reasonCodes,
      evolutionEvaluationId: input.evaluation?.evolutionEvaluationId,
      telemetryId: input.healingTelemetry?.telemetryId,
      learningSignalId: input.learningSignal?.learningSignalId,
      candidateId: input.improvementCandidate?.candidateId,
    },
  });
}
