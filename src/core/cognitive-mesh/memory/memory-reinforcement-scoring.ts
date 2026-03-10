import type { CapabilityResultStatus } from "../capabilities/types/capability-result.types";

export type MemoryReinforcementTrend = "up" | "down" | "stable";

export type MemoryReinforcementReasonCode =
  | "EXECUTION_SUCCESS_VERIFIED"
  | "RECALL_USAGE_SUCCESS"
  | "NO_ANOMALY_BASELINE"
  | "DEGRADED_EXECUTION"
  | "FALLBACK_TRIGGERED"
  | "VERIFICATION_REJECTED"
  | "INTEGRITY_WARNING"
  | "DRIFT_DETECTED"
  | "ADOPTION_SUPPRESSED"
  | "RUNTIME_FAILURE"
  | "SCORE_BOUNDED_MIN"
  | "SCORE_BOUNDED_MAX";

export interface MemoryReinforcementState {
  memoryId: string;
  reinforcementScore: number;
  reinforcementEvents: number;
  reinforcementReasonCodes: MemoryReinforcementReasonCode[];
  lastReinforcedTimestamp: string;
  reinforcementConfidence: number;
  reinforcementTrend: MemoryReinforcementTrend;
}

export interface MemoryReinforcementInput {
  memoryId: string;
  currentScore?: number;
  currentEvents?: number;
  resultStatus: CapabilityResultStatus | "invocation_failed" | "none";
  verificationDecision?: string;
  verificationAdoptable?: boolean;
  cognitiveSignalTypes?: ReadonlyArray<string>;
  fallbackTriggered?: boolean;
  usedInRecall?: boolean;
  adoptedSuppressed?: boolean;
  timestamp?: string;
}

export interface MemoryReinforcementOutcome {
  state: MemoryReinforcementState;
  delta: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeReasonCodes(codes: MemoryReinforcementReasonCode[]): MemoryReinforcementReasonCode[] {
  return [...new Set(codes)].sort();
}

export class MemoryReinforcementScoring {
  static readonly SCORE_MIN = 0;
  static readonly SCORE_DEFAULT = 1;
  static readonly SCORE_MAX = 2.5;

  evaluate(input: MemoryReinforcementInput): MemoryReinforcementOutcome {
    const reasons: MemoryReinforcementReasonCode[] = [];
    const signals = new Set(input.cognitiveSignalTypes ?? []);
    let delta = 0;

    const success = input.resultStatus === "success";
    const degraded = input.resultStatus === "degraded_success";
    const failed =
      input.resultStatus === "failed" ||
      input.resultStatus === "invocation_failed" ||
      input.resultStatus === "denied" ||
      input.resultStatus === "blocked" ||
      input.resultStatus === "invalid" ||
      input.resultStatus === "unavailable" ||
      input.resultStatus === "not_found";
    const verificationRejected =
      input.verificationDecision === "rejected" ||
      input.verificationDecision === "invalid_result" ||
      input.verificationDecision === "inconsistent_result" ||
      input.verificationDecision === "policy_rejected" ||
      input.verificationAdoptable === false;

    if (success && !verificationRejected) {
      delta += 0.12;
      reasons.push("EXECUTION_SUCCESS_VERIFIED");
    }
    if (input.usedInRecall === true && success) {
      delta += 0.06;
      reasons.push("RECALL_USAGE_SUCCESS");
    }
    if (
      !signals.has("integrity_warning") &&
      !signals.has("drift_detected") &&
      !signals.has("verification_rejected") &&
      success
    ) {
      delta += 0.02;
      reasons.push("NO_ANOMALY_BASELINE");
    }

    if (degraded) {
      delta -= 0.1;
      reasons.push("DEGRADED_EXECUTION");
    }
    if (input.fallbackTriggered === true) {
      delta -= 0.12;
      reasons.push("FALLBACK_TRIGGERED");
    }
    if (verificationRejected) {
      delta -= 0.18;
      reasons.push("VERIFICATION_REJECTED");
    }
    if (signals.has("integrity_warning")) {
      delta -= 0.2;
      reasons.push("INTEGRITY_WARNING");
    }
    if (signals.has("drift_detected")) {
      delta -= 0.2;
      reasons.push("DRIFT_DETECTED");
    }
    if (input.adoptedSuppressed === true) {
      delta -= 0.15;
      reasons.push("ADOPTION_SUPPRESSED");
    }
    if (failed) {
      delta -= 0.15;
      reasons.push("RUNTIME_FAILURE");
    }

    const currentScore = Number.isFinite(input.currentScore) ? (input.currentScore as number) : MemoryReinforcementScoring.SCORE_DEFAULT;
    let score = currentScore + delta;
    if (score < MemoryReinforcementScoring.SCORE_MIN) {
      score = MemoryReinforcementScoring.SCORE_MIN;
      reasons.push("SCORE_BOUNDED_MIN");
    } else if (score > MemoryReinforcementScoring.SCORE_MAX) {
      score = MemoryReinforcementScoring.SCORE_MAX;
      reasons.push("SCORE_BOUNDED_MAX");
    }

    const timestamp = input.timestamp ?? new Date().toISOString();
    const events = Math.max(0, Math.trunc(input.currentEvents ?? 0)) + 1;
    const trend: MemoryReinforcementTrend = delta > 0 ? "up" : delta < 0 ? "down" : "stable";
    const confidence = clamp(0.55 + Math.min(0.4, Math.abs(delta)), 0, 1);
    const state: MemoryReinforcementState = {
      memoryId: input.memoryId,
      reinforcementScore: Number(score.toFixed(4)),
      reinforcementEvents: events,
      reinforcementReasonCodes: normalizeReasonCodes(reasons),
      lastReinforcedTimestamp: timestamp,
      reinforcementConfidence: Number(confidence.toFixed(4)),
      reinforcementTrend: trend,
    };
    return {
      state,
      delta: Number(delta.toFixed(4)),
    };
  }
}

