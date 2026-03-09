import { createHash } from "node:crypto";
import type { ExecutionLedger } from "../execution-ledger";
import type { RuntimeStabilityEventInput } from "./runtime-stability.types";

function createExecutionId(runtimeId: string, eventType: string, timestamp: string): string {
  const token = createHash("sha256").update(`${runtimeId}:${eventType}:${timestamp}`).digest("hex").slice(0, 16);
  return `runtime_stability_${token}`;
}

export function emitRuntimeStabilityLedgerEvent(ledger: ExecutionLedger, input: RuntimeStabilityEventInput): void {
  const timestamp = input.evaluation?.evaluatedAt ?? new Date().toISOString();

  ledger.append({
    category: "runtime",
    eventType: input.eventType,
    action: input.eventType,
    source: "runtime_stability_orchestrator",
    target: input.evaluation?.systemStabilityBand ?? "runtime",
    ids: {
      requestId: input.requestId,
      sessionId: input.sessionId,
      correlationId: input.requestId,
      executionId: createExecutionId(input.runtimeId, input.eventType, timestamp),
    },
    mode: input.status === "degraded" ? "degraded" : "normal",
    status: input.status,
    metadata: {
      systemStabilityScore: input.evaluation?.systemStabilityScore,
      systemStabilityBand: input.evaluation?.systemStabilityBand,
      instabilityPatterns: input.evaluation?.instabilityPatterns,
      degradationAction: input.evaluation?.degradationAction,
      reasonCodes: input.reasonCodes,
      stabilityEvaluationId: input.evaluation?.stabilityEvaluationId,
      targetEvaluations: input.evaluation?.targetEvaluations.map((item) => ({
        targetType: item.targetType,
        targetId: item.targetId,
        stabilityScore: item.stabilityScore,
        band: item.band,
        oscillationDetected: item.oscillationDetected,
      })),
    },
  });
}
