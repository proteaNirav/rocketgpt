import type { CognitiveEvent, RecallDecision } from "../types/cognitive-event";
import type { MemoryRecord } from "../types/memory-record";
import type { CognitiveMeshRepository } from "../repositories/cognitive-mesh-repository";

export interface RecallItem {
  id: string;
  content: string;
  source: "working_memory" | "repository_memory" | "recent_event";
}

export interface RecallResult {
  items: RecallItem[];
  filteredCount: number;
  sources: string[];
  dispositionSummary: string;
}

export class RecallFoundation {
  constructor(private readonly repository: CognitiveMeshRepository) {}

  async recall(
    event: CognitiveEvent,
    decision: RecallDecision,
    workingMemory: MemoryRecord[],
    options?: { maxItems?: number; maxChars?: number }
  ): Promise<RecallResult> {
    const maxItems = options?.maxItems ?? 10;
    const maxChars = options?.maxChars ?? 2500;

    if (decision.disposition === "exclude") {
      return {
        items: [],
        filteredCount: workingMemory.length,
        sources: [],
        dispositionSummary: `${decision.disposition}:${decision.reasons.join(",")}`,
      };
    }

    const [recentEvents, recentMemory] = await Promise.all([
      this.repository.findRecentEvents({
        sessionId: event.sessionId,
        sourceType: event.sourceType,
        routeType: event.routeType,
        limit: 6,
      }),
      this.repository.findRecentMemoryItems({
        sessionId: event.sessionId,
        limit: 6,
        maxChars,
      }),
    ]);

    const trustAllowed = decision.disposition === "allow" || decision.disposition === "allow_low_confidence";
    const eventItems: RecallItem[] = trustAllowed
      ? recentEvents.map((item) => ({
          id: item.eventId,
          content: item.normalizedInput,
          source: "recent_event",
        }))
      : [];

    const memoryItems = this.toRecallItems(workingMemory, "working_memory");
    const repoMemoryItems = trustAllowed ? this.toRecallItems(recentMemory, "repository_memory") : [];
    const combined = [...memoryItems, ...repoMemoryItems, ...eventItems];

    const filtered = combined.filter((item) => item.content.length > 0);
    const bounded: RecallItem[] = [];
    let charCount = 0;
    for (const item of filtered) {
      if (bounded.length >= maxItems) {
        break;
      }
      charCount += item.content.length;
      if (charCount > maxChars) {
        break;
      }
      bounded.push(item);
    }

    const sources = Array.from(new Set(bounded.map((item) => item.source)));
    return {
      items: bounded,
      filteredCount: combined.length - bounded.length,
      sources,
      dispositionSummary: `${decision.disposition}:${decision.reasons.join(",")}`,
    };
  }

  private toRecallItems(
    records: MemoryRecord[],
    source: "working_memory" | "repository_memory"
  ): RecallItem[] {
    return records.map((item) => ({
      id: item.id,
      content: item.content,
      source,
    }));
  }
}
