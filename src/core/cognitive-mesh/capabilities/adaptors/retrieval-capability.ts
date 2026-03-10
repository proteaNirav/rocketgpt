import { CAPABILITY_IDS, CAPABILITY_OPERATIONS } from "../constants";
import type { CapabilityAdaptor } from "./capability-adaptor";
import type { CapabilityRequestEnvelope } from "../types/capability-request.types";
import type { CapabilityResultEnvelope } from "../types/capability-result.types";
import type { CapabilityDefinition } from "../types/capability.types";

export interface RetrievalRecord {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

const RETRIEVAL_CAPABILITY: CapabilityDefinition = {
  capabilityId: CAPABILITY_IDS.RETRIEVAL,
  name: "Retrieval Capability",
  family: "knowledge",
  version: "1.0.0",
  status: "active",
  description: "Controlled retrieval over in-memory records for session/runtime lookups.",
  ownerAuthority: "consortium",
  allowedOperations: [CAPABILITY_OPERATIONS.RETRIEVAL_LOOKUP],
  verificationMode: "required",
  riskLevel: "medium",
  directBrainCommitAllowed: false,
  monitoringProfile: "high_scrutiny",
};

function extractQuery(input: unknown): string {
  if (typeof input === "string") {
    return input.trim().toLowerCase();
  }
  if (input && typeof input === "object" && "query" in input) {
    const query = (input as { query?: unknown }).query;
    return typeof query === "string" ? query.trim().toLowerCase() : "";
  }
  return "";
}

export class RetrievalCapability implements CapabilityAdaptor {
  constructor(private readonly records: RetrievalRecord[] = []) {}

  getCapabilityDefinition(): CapabilityDefinition {
    return { ...RETRIEVAL_CAPABILITY, allowedOperations: [...RETRIEVAL_CAPABILITY.allowedOperations] };
  }

  async invoke(request: CapabilityRequestEnvelope): Promise<CapabilityResultEnvelope> {
    const query = extractQuery(request.input);
    const memoryHints = Array.isArray(request.trace?.memoryPacketHints)
      ? (request.trace?.memoryPacketHints as unknown[]).filter((hint): hint is string => typeof hint === "string")
      : [];
    const matches =
      query.length === 0
        ? this.records.slice(0, 5)
        : this.records.filter((record) => record.text.toLowerCase().includes(query)).slice(0, 5);

    return {
      requestId: request.requestId,
      sessionId: request.sessionId,
      capabilityId: request.capabilityId,
      status: "success",
      payload: {
        query,
        count: matches.length,
        memoryContextApplied: memoryHints.length > 0,
        memoryHintCount: memoryHints.length,
        records: matches.map((record) => ({
          id: record.id,
          text: record.text,
          metadata: record.metadata ? { ...record.metadata } : undefined,
        })),
      },
      confidence: matches.length > 0 ? 0.82 : 0.55,
      verificationRequired: true,
      trace: {
        operation: CAPABILITY_OPERATIONS.RETRIEVAL_LOOKUP,
      },
      completedAt: new Date().toISOString(),
    };
  }
}
