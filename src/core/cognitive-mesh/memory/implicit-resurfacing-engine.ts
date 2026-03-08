import { MemoryRanking } from "./memory-ranking";
import type {
  MemoryItem,
  MemoryResurfaceInput,
  RecallEvent,
} from "./types/dual-mode-memory.types";
import { InMemoryCognitiveMemoryRepository } from "./repository/in-memory-cognitive-memory-repository";
import { AdoptedRecallFoundation } from "./adopted-recall-foundation";

let implicitRecallSequence = 0;

export interface ImplicitResurfacingResult {
  advisory: boolean;
  threshold: number;
  items: MemoryItem[];
  recallEvent: RecallEvent;
}

export class ImplicitResurfacingEngine {
  private readonly ranking = new MemoryRanking();
  private readonly adoptedRecall = new AdoptedRecallFoundation();

  constructor(private readonly repository: InMemoryCognitiveMemoryRepository) {}

  resurface(input: MemoryResurfaceInput): ImplicitResurfacingResult {
    const threshold = Math.max(0.45, Math.min(0.95, input.threshold ?? 0.72));
    const limit = Math.max(1, Math.min(6, input.limit ?? 2));
    const pool = this.repository.listMemoryBySession(input.sessionId);
    const recallFiltered = this.adoptedRecall.recall({
      sessionId: input.sessionId,
      items: pool,
      intentHint: input.intentHint,
      routeType: input.routeType,
      riskScore: input.riskScore,
      maxItems: Math.max(1, limit * 2),
    });
    const ranked = this.ranking.rank(recallFiltered.items.map((item) => item.memory), {
      intentHint: input.intentHint,
      routeType: input.routeType,
      riskScore: input.riskScore,
    });
    const selected = ranked.filter((item) => item.score >= threshold).slice(0, limit).map((item) => item.memory);

    implicitRecallSequence += 1;
    const recallEvent: RecallEvent = {
      recallEventId: `recall-implicit-${input.sessionId}-${implicitRecallSequence}`,
      sessionId: input.sessionId,
      mode: "implicit",
      query: input.intentHint,
      selectedMemoryIds: selected.map((item) => item.memoryId),
      thresholdUsed: threshold,
      createdAt: new Date().toISOString(),
      advisoryOnly: true,
      metadata: {
        routeType: input.routeType,
        sourceType: input.sourceType,
      },
    };
    this.repository.saveRecallEvent(recallEvent);
    return {
      advisory: true,
      threshold,
      items: selected,
      recallEvent,
    };
  }
}
