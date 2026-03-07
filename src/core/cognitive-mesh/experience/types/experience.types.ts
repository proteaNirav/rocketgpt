import type { NegativePathIssueCode } from "../../governance/negative-path-taxonomy";

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
  capabilityStatus?: "success" | "failed" | "blocked" | "unavailable" | "invocation_failed" | "none";
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
  sessionId: string;
  timestamp: string;
  source: ExperienceSourceMetadata;
  situation: ExperienceSituation;
  context: ExperienceContext;
  action: ExperienceAction;
  verification: ExperienceVerification;
  outcome: ExperienceOutcome;
  circumstances: CircumstantialContext;
  learnableValue: LearnableValueAssessment;
  governanceIssues: NegativePathIssueCode[];
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
}
