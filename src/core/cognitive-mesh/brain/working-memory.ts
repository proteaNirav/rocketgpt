import type {
  WorkingMemoryEntry,
  WorkingMemorySetOptions,
  WorkingMemorySnapshot,
} from "./types/working-memory.types";

export class WorkingMemory {
  private readonly entries = new Map<string, WorkingMemoryEntry>();

  constructor(private readonly sessionId: string) {}

  set(key: string, value: unknown, options: WorkingMemorySetOptions = {}): WorkingMemoryEntry {
    const entry: WorkingMemoryEntry = {
      key,
      value,
      updatedAt: new Date().toISOString(),
      source: options.source,
      metadata: options.metadata ? { ...options.metadata } : undefined,
    };
    this.entries.set(key, entry);
    return entry;
  }

  get<T = unknown>(key: string): T | undefined {
    return this.entries.get(key)?.value as T | undefined;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  list(): WorkingMemoryEntry[] {
    return [...this.entries.values()].map((entry) => ({
      ...entry,
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }

  snapshot(): WorkingMemorySnapshot {
    const snapshot: WorkingMemorySnapshot = {};
    for (const [key, entry] of this.entries.entries()) {
      snapshot[key] = {
        ...entry,
        metadata: entry.metadata ? { ...entry.metadata } : undefined,
      };
    }
    return snapshot;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

