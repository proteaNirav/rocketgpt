import type { CognitiveEvent, MemoryTier } from "./cognitive-event";

export interface MemoryRecord {
  id: string;
  sessionId: string;
  tier: MemoryTier;
  content: string;
  confidence: number;
  sourceEventId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryQuery {
  sessionId: string;
  requestId?: string;
  tier?: MemoryTier;
  limit?: number;
  minConfidence?: number;
}

export interface MemoryStore {
  put(record: MemoryRecord): Promise<void>;
  get(query: MemoryQuery): Promise<MemoryRecord[]>;
}

export interface CognitiveMemoryRetriever {
  retrieve(query: MemoryQuery, event: CognitiveEvent): Promise<MemoryRecord[]>;
}
