import type { ExperienceRecord as CognitiveExperienceRecord } from "../../experience/types/experience.types";

export type MemoryLayer =
  | "raw_conversation"
  | "episodic"
  | "conceptual"
  | "decision_linked"
  | "unresolved"
  | "cross_domain_bridge"
  | "dream";

export interface ConversationSession {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  sourceType: "chat" | "workflow";
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  messageId: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "runtime";
  content: string;
  createdAt: string;
  source: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemoryTag {
  key: string;
  value: string;
}

export interface MemoryLink {
  sourceMemoryId: string;
  targetMemoryId: string;
  relation: "derives_from" | "supports" | "contradicts" | "resolves" | "bridges";
  createdAt: string;
}

export interface UnresolvedItem {
  unresolvedId: string;
  sessionId: string;
  description: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
  resolvedAt?: string;
  status: "open" | "resolved" | "abandoned";
}

export interface CrossDomainBridge {
  bridgeId: string;
  sessionId: string;
  fromDomain: string;
  toDomain: string;
  bridgeSummary: string;
  createdAt: string;
}

export interface MemoryItem {
  memoryId: string;
  sessionId: string;
  layer: MemoryLayer;
  content: string;
  tags: MemoryTag[];
  links: MemoryLink[];
  provenance: {
    source: string;
    sourceMessageId?: string;
    sourceEventId?: string;
  };
  scores: {
    importance: number;
    novelty: number;
    confidence: number;
    reuse: number;
    relevance: number;
    recency: number;
    crossDomainUsefulness: number;
  };
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryPacket {
  packetId: string;
  sessionId: string;
  capabilityId?: string;
  purpose: string;
  memoryItems: MemoryItem[];
  relevanceFloor: number;
  generatedAt: string;
  provenance: {
    recallReason: string;
    explicit: boolean;
    query?: string;
  };
}

export interface RecallEvent {
  recallEventId: string;
  sessionId: string;
  mode: "explicit" | "implicit";
  query?: string;
  selectedMemoryIds: string[];
  thresholdUsed: number;
  createdAt: string;
  advisoryOnly: boolean;
  metadata?: Record<string, unknown>;
}

export interface CatFeedback {
  feedbackId: string;
  sessionId: string;
  capabilityId: string;
  learnerInput?: string;
  guardrailsApplied: string[];
  memoryPacketId?: string;
  memoryInjectedIds: string[];
  actionSummary: string;
  outcome: "successful" | "partial" | "failed" | "guarded" | "rejected";
  reflection?: string;
  confidence?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ExperienceReuseScore {
  reuseBoost: number;
  cautionLevel: "none" | "low" | "medium" | "high";
  rationale: string[];
}

export type MemoryExperienceRecord = CognitiveExperienceRecord;

export interface MemoryRecallQuery {
  sessionId: string;
  query: string;
  limit?: number;
  minRelevance?: number;
  layers?: MemoryLayer[];
  capabilityId?: string;
}

export interface MemoryResurfaceInput {
  sessionId: string;
  routeType?: string;
  sourceType: string;
  intentHint?: string;
  riskScore: number;
  threshold?: number;
  limit?: number;
}

export interface MemoryAccessContext {
  sessionId: string;
  capabilityId?: string;
  purpose: string;
  entitlement?: {
    allowInjection: boolean;
    reason?: string;
  };
}
