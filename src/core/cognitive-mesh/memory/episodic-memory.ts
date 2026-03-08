import type { MemoryQuery, MemoryRecord, MemoryStore } from "../types/memory-record";

/**
 * EpisodicMemory is a placeholder for event-sequence memory storage.
 * V1 uses in-memory/session-local buffering only.
 */
export class EpisodicMemory implements MemoryStore {
  private readonly bySession = new Map<string, MemoryRecord[]>();

  async put(record: MemoryRecord): Promise<void> {
    const items = this.bySession.get(record.sessionId) ?? [];
    items.push(record);
    this.bySession.set(record.sessionId, items);
  }

  async get(query: MemoryQuery): Promise<MemoryRecord[]> {
    const items = this.bySession.get(query.sessionId) ?? [];
    return items
      .filter((item) => (query.tier ? item.tier === query.tier : true))
      .slice(0, query.limit ?? 20);
  }
}
