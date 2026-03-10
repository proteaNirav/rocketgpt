import type { CapabilityResultEnvelope } from "./capability-result.types";

export type VerificationVerdict = "accept" | "reject" | "escalate" | "review";
export type VerificationTrustDisposition = "passed" | "failed" | "downgraded" | "inconclusive" | "unavailable";

export type VerificationRecommendedAction = "accept" | "reject" | "escalate" | "review";

export interface VerificationRequestEnvelope {
  verificationRequestId: string;
  sessionId: string;
  capabilityId: string;
  capabilityResult: CapabilityResultEnvelope;
  requestedAt: string;
  trace?: Record<string, unknown>;
}

export interface VerificationResultEnvelope {
  verificationRequestId: string;
  sessionId: string;
  capabilityId: string;
  verdict: VerificationVerdict;
  confidence: number;
  notes: string[];
  recommendedAction: VerificationRecommendedAction;
  completedAt: string;
  trace?: Record<string, unknown>;
}
