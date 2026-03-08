import type { NegativePathIssueCode } from "../../governance/negative-path-taxonomy";
import type { MemoryReinforcementReasonCode, MemoryReinforcementTrend } from "../../memory/memory-reinforcement-scoring";

export type ExperienceOutcomeClassification =
  | "successful"
  | "successful-with-verification"
  | "successful-with-fallback"
  | "partial"
  | "rejected"
  | "failed"
  | "guarded"
  | "aborted";

export type ExperienceOutcomeStatus = "positive" | "neutral" | "negative";

export type ExperienceStabilityImpact = "positive" | "neutral" | "negative" | "critical";

export type ExperienceType = "execution" | "verification" | "anomaly" | "reinforcement" | "recall";

export type ExperienceCategory =
  | "execution_success"
  | "execution_degraded"
  | "execution_failure"
  | "verification_rejection"
  | "anomaly_detected"
  | "drift_detected"
  | "reinforcement_positive"
  | "reinforcement_negative"
  | "recall_success"
  | "recall_misfire";

export type ExperienceOutcomeLabel = "positive" | "degraded" | "negative" | "rejected" | "warning";

export interface ExperienceReinforcementEvent {
  memoryId: string;
  delta: number;
  trend: MemoryReinforcementTrend;
  reasonCodes: MemoryReinforcementReasonCode[];
  timestamp: string;
}

export interface ExperienceSituation {
  mode: "chat" | "workflow";
  routeType?: string;
  sourceType: string;
  intentHint?: string;
}

export interface ExperienceContext {
  cognitiveState: string;
  trustClass: string;
  riskScore: number;
  tags: string[];
}

export interface ExperienceAction {
  capabilityId?: string;
  capabilityStatus?:
    | "success"
    | "degraded_success"
    | "failed"
    | "denied"
    | "blocked"
    | "not_found"
    | "invalid"
    | "unavailable"
    | "invocation_failed"
    | "none";
  verificationInvoked: boolean;
  routeDisposition?: string;
  routeAccepted?: boolean;
}

export interface ExperienceVerification {
  required: boolean;
  verdict?: "accept" | "reject" | "escalate" | "review";
  confidence?: number;
  notes?: string[];
}

export interface ExperienceOutcome {
  classification: ExperienceOutcomeClassification;
  status: ExperienceOutcomeStatus;
  reusable: boolean;
  stabilityImpact: ExperienceStabilityImpact;
  summary: string;
}

export interface CircumstantialContext {
  fallbackTriggered: boolean;
  guardrailApplied: boolean;
  verificationRequired: boolean;
  verificationFailed: boolean;
  multipleCapabilitiesUsed: boolean;
  highComplexityRequest: boolean;
  stateFragility: boolean;
  recoveryPathUsed: boolean;
  lowConfidenceResult: boolean;
}

export interface LearnableValueAssessment {
  level: "high" | "medium" | "low" | "none";
  rationale: string[];
  reusableValue: boolean;
}

export interface ExperienceSourceMetadata {
  component: "mesh-live-runtime";
  source: string;
  requestId?: string;
  eventId?: string;
}

export interface ExperienceRecord {
  experienceId: string;
  experienceType: ExperienceType;
  experienceCategory: ExperienceCategory;
  experienceOutcome: ExperienceOutcomeLabel;
  experienceScore: number;
  experienceConfidence: number;
  sessionId: string;
  timestamp: string;
  sourceCapability?: string;
  relatedMemoryId?: string;
  relatedExecutionId?: string;
  relatedSignals: string[];
  relatedReinforcementEvents: ExperienceReinforcementEvent[];
  experienceTags: string[];
  experienceMetadata: Record<string, unknown>;
  source: ExperienceSourceMetadata;
  situation: ExperienceSituation;
  context: ExperienceContext;
  action: ExperienceAction;
  verification: ExperienceVerification;
  outcome: ExperienceOutcome;
  circumstances: CircumstantialContext;
  learnableValue: LearnableValueAssessment;
  // Canonical normalized governance issue codes attached to this outcome.
  governanceIssues: NegativePathIssueCode[];
  // Search-friendly tags. `issue:*` tags are derived from governanceIssues.
  // `harmful:*` tags are derived clustering signals and are not canonical issue codes.
  tags: string[];
  relevanceScore: number;
  isMeaningful: boolean;
}

export interface ExperienceCircumstantialSignalInput {
  fallbackTriggered?: boolean;
  guardrailApplied?: boolean;
  verificationRequired?: boolean;
  verificationVerdict?: "accept" | "reject" | "escalate" | "review";
  capabilitiesUsed?: string[];
  requestComplexityScore?: number;
  stateFragility?: boolean;
  recoveryPathUsed?: boolean;
  confidence?: number;
}

export interface ExperienceCaptureFacts {
  sessionId: string;
  timestamp: string;
  source: ExperienceSourceMetadata;
  situation: ExperienceSituation;
  context: ExperienceContext;
  action: ExperienceAction;
  verification: ExperienceVerification;
  circumstances: ExperienceCircumstantialSignalInput;
  routeError?: string;
  routeFallbackUsed: boolean;
  executionAborted?: boolean;
  governanceIssues?: NegativePathIssueCode[];
  tags?: string[];
  relatedSignals?: string[];
  relatedMemoryId?: string;
  relatedExecutionId?: string;
  relatedReinforcementEvents?: ExperienceReinforcementEvent[];
  recallOutcome?: "success" | "misfire";
  experienceMetadata?: Record<string, unknown>;
}
