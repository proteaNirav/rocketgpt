import type { MemoryQuery, MemoryRecord, MemoryStore } from "../types/memory-record";

/**
 * ArchiveMemory is a non-authoritative placeholder for long-term retention.
 * Real durable storage integration is deferred by design.
 */
export class ArchiveMemory implements MemoryStore {
  async put(_record: MemoryRecord): Promise<void> {
    // intentionally no-op in V1 foundation
  }

  async get(_query: MemoryQuery): Promise<MemoryRecord[]> {
    return [];
  }
}
