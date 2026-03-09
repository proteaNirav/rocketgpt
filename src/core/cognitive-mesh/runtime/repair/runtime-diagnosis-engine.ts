import { createHash } from "node:crypto";
import type {
  RuntimeDiagnosisInput,
  RuntimeRepairAction,
  RuntimeRepairAnomalyType,
  RuntimeRepairDiagnosis,
  RuntimeRepairSeverity,
  RuntimeRepairTargetType,
} from "./runtime-repair.types";

function toIsoTimestamp(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch)) {
    return new Date().toISOString();
  }
  return new Date(epoch).toISOString();
}

function hashId(prefix: string, material: unknown): string {
  const payload = JSON.stringify(material);
  const digest = createHash("sha256").update(payload).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

function normalizeSeverity(value: RuntimeRepairSeverity | undefined): RuntimeRepairSeverity {
  if (value === "low" || value === "medium" || value === "high" || value === "critical") {
    return value;
  }
  return "medium";
}

function deriveAnomalyType(input: RuntimeDiagnosisInput): RuntimeRepairAnomalyType {
  if (input.anomalyType) {
    return input.anomalyType;
  }
  if (input.heartbeatState === "stale") {
    return "stale_heartbeat";
  }
  return "unsupported";
}

function mapTargetType(anomalyType: RuntimeRepairAnomalyType): RuntimeRepairTargetType {
  switch (anomalyType) {
    case "stale_heartbeat":
      return "runtime";
    case "queue_backlog":
      return "queue";
    case "memory_pressure":
      return "memory";
    case "capability_timeout":
    case "capability_lock_stuck":
      return "capability";
    default:
      return "runtime";
  }
}

function mapAction(anomalyType: RuntimeRepairAnomalyType): RuntimeRepairAction {
  switch (anomalyType) {
    case "stale_heartbeat":
      return "restart_runtime_worker";
    case "queue_backlog":
      return "recover_queue";
    case "memory_pressure":
      return "cleanup_memory";
    case "capability_timeout":
    case "capability_lock_stuck":
      return "reset_capability_state";
    default:
      return "no_action";
  }
}

function defaultReasonCode(anomalyType: RuntimeRepairAnomalyType): string {
  switch (anomalyType) {
    case "stale_heartbeat":
      return "ANOMALY_STALE_HEARTBEAT";
    case "queue_backlog":
      return "ANOMALY_QUEUE_BACKLOG";
    case "memory_pressure":
      return "ANOMALY_MEMORY_PRESSURE";
    case "capability_timeout":
      return "ANOMALY_CAPABILITY_TIMEOUT";
    case "capability_lock_stuck":
      return "ANOMALY_CAPABILITY_LOCK_STUCK";
    default:
      return "ANOMALY_UNSUPPORTED";
  }
}

function deriveSeverity(anomalyType: RuntimeRepairAnomalyType, preferred: RuntimeRepairSeverity): RuntimeRepairSeverity {
  if (preferred !== "medium") {
    return preferred;
  }
  if (anomalyType === "stale_heartbeat" || anomalyType === "queue_backlog") {
    return "high";
  }
  if (anomalyType === "capability_lock_stuck") {
    return "high";
  }
  if (anomalyType === "capability_timeout") {
    return "medium";
  }
  if (anomalyType === "memory_pressure") {
    return "medium";
  }
  return "low";
}

export class RuntimeDiagnosisEngine {
  diagnose(input: RuntimeDiagnosisInput): RuntimeRepairDiagnosis {
    const detectedAt = toIsoTimestamp(input.detectedAt);
    const anomalyType = deriveAnomalyType(input);
    const likelyTargetType = mapTargetType(anomalyType);
    const recommendedRepairAction = mapAction(anomalyType);
    const preferredSeverity = normalizeSeverity(input.severity);
    const severity = deriveSeverity(anomalyType, preferredSeverity);
    const reasonCodes = [...new Set([...(input.reasonCodes ?? []), defaultReasonCode(anomalyType)])];
    const repairable = recommendedRepairAction !== "no_action";

    const diagnosisMaterial = {
      source: input.source,
      anomalyType,
      severity,
      likelyTargetType,
      likelyTargetId: input.likelyTargetId ?? null,
      reasonCodes,
      detectedAt,
    };

    return {
      diagnosisId: hashId("diag", diagnosisMaterial),
      detectedAt,
      source: input.source,
      anomalyType,
      severity,
      repairable,
      likelyTargetType,
      likelyTargetId: input.likelyTargetId ?? null,
      recommendedRepairAction,
      reasonCodes,
      metadata: { ...(input.metadata ?? {}) },
    };
  }
}
