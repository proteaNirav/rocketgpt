export interface WorkingMemorySetOptions {
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkingMemoryEntry {
  key: string;
  value: unknown;
  updatedAt: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export type WorkingMemorySnapshot = Record<string, WorkingMemoryEntry>;

