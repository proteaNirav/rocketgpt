export interface CatsRegistrySummary {
  key: string;
  summary: string;
  updatedAt: string;
}

export class CatsRegistrySummaryCache {
  private readonly cache = new Map<string, { value: CatsRegistrySummary; expiresAt: number }>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(options?: { ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = options?.ttlMs ?? 5 * 60_000;
    this.maxEntries = options?.maxEntries ?? 200;
  }

  get(key: string): CatsRegistrySummary | null {
    const row = this.cache.get(key);
    if (!row) {
      return null;
    }
    if (row.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return row.value;
  }

  set(key: string, summary: string): CatsRegistrySummary {
    if (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    const value = { key, summary, updatedAt: new Date().toISOString() };
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }
}
