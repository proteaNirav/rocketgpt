import { CAPABILITY_IDS, CAPABILITY_OPERATIONS } from "../constants";
import type { CapabilityAdaptor } from "./capability-adaptor";
import type { CapabilityRequestEnvelope } from "../types/capability-request.types";
import type { CapabilityResultEnvelope } from "../types/capability-result.types";
import type { CapabilityDefinition } from "../types/capability.types";
import type {
  VerificationRequestEnvelope,
  VerificationResultEnvelope,
  VerificationVerdict,
} from "../types/verification.types";

const VERIFICATION_CAPABILITY: CapabilityDefinition = {
  capabilityId: CAPABILITY_IDS.VERIFICATION,
  name: "Verification Capability",
  family: "assurance",
  version: "1.0.0",
  status: "active",
  description: "Learner handoff contract baseline for capability result verification.",
  ownerAuthority: "consortium",
  allowedOperations: [CAPABILITY_OPERATIONS.VERIFICATION_VALIDATE],
  verificationMode: "none",
  riskLevel: "low",
  directBrainCommitAllowed: true,
  monitoringProfile: "assurance",
};

function normalizeConfidence(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  const normalized = value as number;
  return Math.max(0, Math.min(1, normalized));
}

function decideVerdict(confidence: number, hasErrors: boolean): VerificationVerdict {
  if (hasErrors) {
    return "reject";
  }
  if (confidence >= 0.8) {
    return "accept";
  }
  if (confidence >= 0.55) {
    return "review";
  }
  return "escalate";
}

export class VerificationCapability implements CapabilityAdaptor {
  getCapabilityDefinition(): CapabilityDefinition {
    return { ...VERIFICATION_CAPABILITY, allowedOperations: [...VERIFICATION_CAPABILITY.allowedOperations] };
  }

  async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
    const payload = request.input as VerificationRequestEnvelope;
    const verification = this.verify(payload);
    return {
      requestId: request.requestId,
      sessionId: request.sessionId,
      capabilityId: request.capabilityId,
      status: "success",
      payload: verification,
      confidence: verification.confidence,
      verificationRequired: false,
      trace: {
        operation: CAPABILITY_OPERATIONS.VERIFICATION_VALIDATE,
      },
      completedAt: new Date().toISOString(),
    };
  }

  verify(request: VerificationRequestEnvelope): VerificationResultEnvelope {
    const confidence = normalizeConfidence(request.capabilityResult.confidence);
    const hasErrors = (request.capabilityResult.errors?.length ?? 0) > 0;
    const verdict = decideVerdict(confidence, hasErrors);
    const memoryPacketSeen = Boolean(request.trace && "memoryPacketId" in request.trace);
    return {
      verificationRequestId: request.verificationRequestId,
      sessionId: request.sessionId,
      capabilityId: request.capabilityId,
      verdict,
      confidence,
      notes: hasErrors
        ? ["capability_result_contains_errors"]
        : memoryPacketSeen
          ? ["verification_completed", "memory_context_observed"]
          : ["verification_completed"],
      recommendedAction: verdict,
      completedAt: new Date().toISOString(),
      trace: request.trace ? { ...request.trace } : undefined,
    };
  }
}
