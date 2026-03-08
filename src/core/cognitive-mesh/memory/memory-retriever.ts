import type { CognitiveEvent } from "../types/cognitive-event";
import type { CognitiveMemoryRetriever, MemoryQuery, MemoryRecord, MemoryStore } from "../types/memory-record";

/**
 * MemoryRetriever provides a single interface over multiple memory stores.
 * Retrieval policy stays simple and deterministic in V1.
 */
export class MemoryRetriever implements CognitiveMemoryRetriever {
  constructor(private readonly stores: MemoryStore[]) {}

  async retrieve(query: MemoryQuery, _event: CognitiveEvent): Promise<MemoryRecord[]> {
    const batches = await Promise.all(this.stores.map((store) => store.get(query)));
    return batches.flat().slice(0, query.limit ?? 20);
  }
}
