import { CAPABILITY_IDS, CAPABILITY_OPERATIONS } from "../constants";
import type { CapabilityAdaptor } from "./capability-adaptor";
import type { CapabilityRequestEnvelope } from "../types/capability-request.types";
import type { CapabilityResultEnvelope } from "../types/capability-result.types";
import type { CapabilityDefinition } from "../types/capability.types";

const LANGUAGE_CAPABILITY: CapabilityDefinition = {
  capabilityId: CAPABILITY_IDS.LANGUAGE,
  name: "Language Capability",
  family: "knowledge",
  version: "1.0.0",
  status: "active",
  description: "Deterministic text normalization/structuring/summarization helper.",
  ownerAuthority: "consortium",
  allowedOperations: [
    CAPABILITY_OPERATIONS.LANGUAGE_NORMALIZE,
    CAPABILITY_OPERATIONS.LANGUAGE_SUMMARIZE,
    CAPABILITY_OPERATIONS.LANGUAGE_STRUCTURE,
  ],
  verificationMode: "none",
  riskLevel: "low",
  directBrainCommitAllowed: true,
  monitoringProfile: "standard",
};

function asText(input: unknown): string {
  if (typeof input === "string") {
    return input;
  }
  if (input == null) {
    return "";
  }
  return JSON.stringify(input);
}

export class LanguageCapability implements CapabilityAdaptor {
  getCapabilityDefinition(): CapabilityDefinition {
    return { ...LANGUAGE_CAPABILITY, allowedOperations: [...LANGUAGE_CAPABILITY.allowedOperations] };
  }

  async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
    const text = asText(request.input).trim();
    const memoryHints = Array.isArray(request.trace?.memoryPacketHints)
      ? (request.trace?.memoryPacketHints as unknown[]).filter((hint): hint is string => typeof hint === "string")
      : [];
    const normalized = text.replace(/\s+/g, " ").trim();
    const summary =
      normalized.length <= 140 ? normalized : `${normalized.slice(0, 137).trimEnd()}...`;
    const memoryContextApplied = memoryHints.length > 0;

    return {
      requestId: request.requestId,
      sessionId: request.sessionId,
      capabilityId: request.capabilityId,
      status: "success",
      payload: {
        normalizedText: normalized,
        summaryText: summary,
        length: normalized.length,
        memoryContextApplied,
        memoryHintCount: memoryHints.length,
        memoryHints: memoryHints.slice(0, 2),
      },
      confidence: normalized.length > 0 ? 0.88 : 0.6,
      verificationRequired: false,
      trace: {
        operation: CAPABILITY_OPERATIONS.LANGUAGE_NORMALIZE,
      },
      completedAt: new Date().toISOString(),
    };
  }
}
