import { MemoryRanking } from "./memory-ranking";
import type {
  MemoryItem,
  MemoryRecallQuery,
  RecallEvent,
} from "./types/dual-mode-memory.types";
import { InMemoryCognitiveMemoryRepository } from "./repository/in-memory-cognitive-memory-repository";
import { AdoptedRecallFoundation } from "./adopted-recall-foundation";

let recallSequence = 0;

export interface ExplicitRecallResult {
  items: MemoryItem[];
  recallEvent: RecallEvent;
}

export class ExplicitRecallEngine {
  private readonly ranking = new MemoryRanking();
  private readonly adoptedRecall = new AdoptedRecallFoundation();

  constructor(private readonly repository: InMemoryCognitiveMemoryRepository) {}

  recall(query: MemoryRecallQuery): ExplicitRecallResult {
    const pool = this.repository
      .listMemoryBySession(query.sessionId)
      .filter((item) => (query.layers ? query.layers.includes(item.layer) : true));
    const recallFiltered = this.adoptedRecall.recall({
      sessionId: query.sessionId,
      items: pool,
      query: query.query,
      capabilityId: query.capabilityId,
      maxItems: Math.max(1, query.limit ?? 5) * 2,
    });
    const ranked = this.ranking.rank(recallFiltered.items.map((item) => item.memory), {
      query: query.query,
    });
    const minRelevance = Math.max(0, Math.min(1, query.minRelevance ?? 0.35));
    const limit = Math.max(1, query.limit ?? 5);
    const selected = ranked
      .filter((item) => item.score >= minRelevance)
      .slice(0, limit)
      .map((item) => item.memory);

    recallSequence += 1;
    const recallEvent: RecallEvent = {
      recallEventId: `recall-explicit-${query.sessionId}-${recallSequence}`,
      sessionId: query.sessionId,
      mode: "explicit",
      query: query.query,
      selectedMemoryIds: selected.map((item) => item.memoryId),
      thresholdUsed: minRelevance,
      createdAt: new Date().toISOString(),
      advisoryOnly: false,
      metadata: query.capabilityId ? { capabilityId: query.capabilityId } : undefined,
    };
    this.repository.saveRecallEvent(recallEvent);
    return {
      items: selected,
      recallEvent,
    };
  }
}
