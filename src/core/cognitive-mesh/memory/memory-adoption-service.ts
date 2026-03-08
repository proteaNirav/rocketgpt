import { hashCanonicalJson } from "../runtime/timeline-canonicalizer";
import type { CapabilityResultStatus } from "../capabilities/types/capability-result.types";
import type { CapabilityVerificationOutcome } from "../capabilities/orchestration/capability-verification";
import type { CognitiveRuntimeSignal } from "../runtime/cognitive-signal-system";
import type { MemoryItem, MemoryLayer, MemoryTag } from "./types/dual-mode-memory.types";
import { CognitiveMemoryService } from "./cognitive-memory-service";

export type MemoryAdoptionDecision =
  | "adopted"
  | "adopted_with_warnings"
  | "suppressed"
  | "rejected"
  | "downgraded_adoption"
  | "invalid_memory_candidate";

export type MemoryAdoptionReasonCode =
  | "CANDIDATE_MISSING_SESSION_ID"
  | "CANDIDATE_MISSING_CAPABILITY_ID"
  | "CANDIDATE_STATUS_MISSING_PAYLOAD"
  | "RESULT_STATUS_NOT_ADOPTABLE"
  | "VERIFICATION_REJECTED"
  | "DIRECT_COMMIT_NOT_ELIGIBLE"
  | "INTEGRITY_RISK_SUPPRESSED"
  | "DRIFT_RISK_SUPPRESSED"
  | "ANOMALY_SIGNAL_SUPPRESSED"
  | "DEGRADED_RESULT_DOWNGRADED"
  | "FALLBACK_RESULT_DOWNGRADED";

export interface NormalizedAdoptedMemoryRecord {
  schemaVersion: "rgpt.memory_adoption_record.v1";
  memoryId: string;
  stableIdentity: string;
  sessionId: string;
  requestId?: string;
  executionId?: string;
  correlationId?: string;
  capabilityId: string;
  routeType?: string;
  source: "mesh_live_runtime" | "capability_mesh_orchestrator";
  category: "capability_result";
  layer: MemoryLayer;
  content: string;
  payload?: unknown;
  adoptionDecision: MemoryAdoptionDecision;
  quality: "trusted" | "warning" | "degraded" | "suppressed";
  reasonCodes: MemoryAdoptionReasonCode[];
  warnings: string[];
  signalTypes: string[];
  verificationDecision?: CapabilityVerificationOutcome["decision"];
  verificationAdoptable?: boolean;
  resultStatus: CapabilityResultStatus | "invocation_failed" | "none";
  fallbackTriggered: boolean;
  confidence?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryAdoptionOutcome {
  decision: MemoryAdoptionDecision;
  adoptable: boolean;
  writeToWorkingMemory: boolean;
  reasonCodes: MemoryAdoptionReasonCode[];
  warnings: string[];
  quality: "trusted" | "warning" | "degraded" | "suppressed";
  memoryRecord?: NormalizedAdoptedMemoryRecord;
}

export interface MemoryAdoptionCandidate {
  sessionId: string;
  requestId?: string;
  executionId?: string;
  correlationId?: string;
  routeType?: string;
  capabilityId: string;
  source: "mesh_live_runtime" | "capability_mesh_orchestrator";
  resultStatus: CapabilityResultStatus | "invocation_failed" | "none";
  payload?: unknown;
  confidence?: number;
  capabilityVerification?: CapabilityVerificationOutcome;
  directCommitEligible: boolean;
  fallbackTriggered?: boolean;
  cognitiveSignals?: ReadonlyArray<CognitiveRuntimeSignal>;
  metadata?: Record<string, unknown>;
}

function normalizeReasonCodes(codes: MemoryAdoptionReasonCode[]): MemoryAdoptionReasonCode[] {
  return [...new Set(codes)].sort();
}

function normalizeWarnings(warnings: string[]): string[] {
  return [...new Set(warnings.filter((warning) => warning.trim().length > 0))].sort();
}

function summarizePayload(payload: unknown): string {
  if (typeof payload === "string") {
    return payload.length <= 320 ? payload : `${payload.slice(0, 317)}...`;
  }
  if (payload == null) {
    return "no_payload";
  }
  try {
    const text = JSON.stringify(payload);
    return text.length <= 320 ? text : `${text.slice(0, 317)}...`;
  } catch {
    return String(payload);
  }
}

function mapDecisionToLayer(decision: MemoryAdoptionDecision): MemoryLayer {
  if (decision === "adopted") {
    return "conceptual";
  }
  if (decision === "downgraded_adoption") {
    return "decision_linked";
  }
  return "episodic";
}

function mapSignalTypes(signals?: ReadonlyArray<CognitiveRuntimeSignal>): string[] {
  return [...new Set((signals ?? []).map((signal) => signal.signalType))].sort();
}

function toMemoryItem(record: NormalizedAdoptedMemoryRecord): MemoryItem {
  const tags: MemoryTag[] = [
    { key: "capability_id", value: record.capabilityId },
    { key: "adoption_decision", value: record.adoptionDecision },
    { key: "quality", value: record.quality },
    { key: "result_status", value: record.resultStatus },
  ];
  if (record.routeType) {
    tags.push({ key: "route_type", value: record.routeType });
  }
  for (const signalType of record.signalTypes.slice(0, 8)) {
    tags.push({ key: "signal", value: signalType });
  }
  return {
    memoryId: record.memoryId,
    sessionId: record.sessionId,
    layer: record.layer,
    content: record.content,
    tags,
    links: [],
    provenance: {
      source: "memory_adoption",
      sourceEventId: record.executionId ?? record.requestId,
    },
    scores: {
      importance: record.quality === "trusted" ? 0.85 : record.quality === "degraded" ? 0.55 : 0.45,
      novelty: 0.5,
      confidence: Math.max(0, Math.min(1, record.confidence ?? (record.quality === "trusted" ? 0.85 : 0.55))),
      reuse: record.quality === "trusted" ? 0.75 : record.quality === "degraded" ? 0.45 : 0.3,
      relevance: record.quality === "trusted" ? 0.8 : 0.5,
      recency: 1,
      crossDomainUsefulness: 0.35,
    },
    createdAt: record.createdAt,
    updatedAt: record.createdAt,
    metadata: {
      adoptionDecision: record.adoptionDecision,
      reasonCodes: [...record.reasonCodes],
      warnings: [...record.warnings],
      verificationDecision: record.verificationDecision,
      verificationAdoptable: record.verificationAdoptable,
      fallbackTriggered: record.fallbackTriggered,
      signalTypes: [...record.signalTypes],
      source: record.source,
      ...(record.metadata ? { ...record.metadata } : {}),
    },
  };
}

export class MemoryAdoptionService {
  constructor(private readonly memoryService?: CognitiveMemoryService) {}

  evaluateCapabilityCandidate(input: MemoryAdoptionCandidate): MemoryAdoptionOutcome {
    const reasons: MemoryAdoptionReasonCode[] = [];
    const warnings: string[] = [];
    const signalTypes = mapSignalTypes(input.cognitiveSignals);
    const hasIntegrityRisk = signalTypes.includes("integrity_warning");
    const hasDriftRisk = signalTypes.includes("drift_detected");
    const hasAnomalyRisk = signalTypes.includes("verification_rejected");
    const fallbackTriggered = input.fallbackTriggered === true;
    const verification = input.capabilityVerification;
    const verificationRejected =
      verification != null &&
      (verification.decision === "rejected" ||
        verification.decision === "invalid_result" ||
        verification.decision === "inconsistent_result" ||
        verification.decision === "policy_rejected");

    if (!input.sessionId || input.sessionId.trim().length === 0) {
      reasons.push("CANDIDATE_MISSING_SESSION_ID");
    }
    if (!input.capabilityId || input.capabilityId.trim().length === 0) {
      reasons.push("CANDIDATE_MISSING_CAPABILITY_ID");
    }
    if (
      (input.resultStatus === "success" || input.resultStatus === "degraded_success") &&
      input.payload === undefined
    ) {
      reasons.push("CANDIDATE_STATUS_MISSING_PAYLOAD");
    }
    if (reasons.length > 0) {
      return {
        decision: "invalid_memory_candidate",
        adoptable: false,
        writeToWorkingMemory: false,
        reasonCodes: normalizeReasonCodes(reasons),
        warnings: [],
        quality: "suppressed",
      };
    }

    if (
      input.resultStatus === "failed" ||
      input.resultStatus === "denied" ||
      input.resultStatus === "blocked" ||
      input.resultStatus === "not_found" ||
      input.resultStatus === "invalid" ||
      input.resultStatus === "unavailable" ||
      input.resultStatus === "invocation_failed" ||
      input.resultStatus === "none"
    ) {
      reasons.push("RESULT_STATUS_NOT_ADOPTABLE");
      return {
        decision: "rejected",
        adoptable: false,
        writeToWorkingMemory: false,
        reasonCodes: normalizeReasonCodes(reasons),
        warnings: [],
        quality: "suppressed",
      };
    }

    if (verificationRejected) {
      reasons.push("VERIFICATION_REJECTED");
      return {
        decision: "rejected",
        adoptable: false,
        writeToWorkingMemory: false,
        reasonCodes: normalizeReasonCodes(reasons),
        warnings: [],
        quality: "suppressed",
      };
    }

    if (hasIntegrityRisk) {
      reasons.push("INTEGRITY_RISK_SUPPRESSED");
    }
    if (hasDriftRisk) {
      reasons.push("DRIFT_RISK_SUPPRESSED");
    }
    if (hasAnomalyRisk) {
      reasons.push("ANOMALY_SIGNAL_SUPPRESSED");
    }
    if (reasons.length > 0) {
      return {
        decision: "suppressed",
        adoptable: false,
        writeToWorkingMemory: false,
        reasonCodes: normalizeReasonCodes(reasons),
        warnings: [],
        quality: "suppressed",
      };
    }

    let decision: MemoryAdoptionDecision = "adopted";
    let quality: MemoryAdoptionOutcome["quality"] = "trusted";
    const downgraded =
      input.resultStatus === "degraded_success" ||
      fallbackTriggered ||
      verification?.decision === "degraded_accepted";
    const warningMode =
      verification?.decision === "accepted_with_warnings" ||
      (verification?.warnings?.length ?? 0) > 0;

    if (downgraded) {
      decision = "downgraded_adoption";
      quality = "degraded";
      if (input.resultStatus === "degraded_success") {
        reasons.push("DEGRADED_RESULT_DOWNGRADED");
      }
      if (fallbackTriggered) {
        reasons.push("FALLBACK_RESULT_DOWNGRADED");
      }
    } else if (warningMode || !input.directCommitEligible) {
      decision = "adopted_with_warnings";
      quality = "warning";
      if (!input.directCommitEligible) {
        reasons.push("DIRECT_COMMIT_NOT_ELIGIBLE");
      }
    }

    if (verification?.warnings?.length) {
      warnings.push(...verification.warnings);
    }

    const createdAt = new Date().toISOString();
    const stableIdentity = hashCanonicalJson({
      sessionId: input.sessionId,
      requestId: input.requestId,
      executionId: input.executionId,
      capabilityId: input.capabilityId,
      routeType: input.routeType,
      resultStatus: input.resultStatus,
      decision,
      payload: input.payload,
      verificationDecision: verification?.decision,
      reasonCodes: normalizeReasonCodes(reasons),
      signalTypes,
    });
    const memoryId = `mem-adopt-${stableIdentity.slice(0, 20)}`;
    const memoryRecord: NormalizedAdoptedMemoryRecord = {
      schemaVersion: "rgpt.memory_adoption_record.v1",
      memoryId,
      stableIdentity,
      sessionId: input.sessionId,
      requestId: input.requestId,
      executionId: input.executionId,
      correlationId: input.correlationId,
      capabilityId: input.capabilityId,
      routeType: input.routeType,
      source: input.source,
      category: "capability_result",
      layer: mapDecisionToLayer(decision),
      content: summarizePayload(input.payload),
      payload: input.payload,
      adoptionDecision: decision,
      quality,
      reasonCodes: normalizeReasonCodes(reasons),
      warnings: normalizeWarnings(warnings),
      signalTypes,
      verificationDecision: verification?.decision,
      verificationAdoptable: verification?.adoptable,
      resultStatus: input.resultStatus,
      fallbackTriggered,
      confidence: input.confidence,
      createdAt,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };
    if (this.memoryService) {
      this.memoryService.saveMemoryItem(toMemoryItem(memoryRecord));
    }

    return {
      decision,
      adoptable: true,
      writeToWorkingMemory: decision === "adopted",
      reasonCodes: memoryRecord.reasonCodes,
      warnings: memoryRecord.warnings,
      quality,
      memoryRecord,
    };
  }
}

