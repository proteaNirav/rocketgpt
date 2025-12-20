/**
 * In-Memory Store for V9 Approvals
 *
 * - TTL-based expiry (soft time-based eviction)
 * - LRU-style capacity control (oldest entries removed first)
 * - Simple key/value API used by Approvals Evaluator
 *
 * NOTE:
 *  - Keys are typically runId or runId:step:category
 *  - Values are usually normalized ApprovalPacket objects
 */

const DEFAULT_MAX_ITEMS = 500;
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface StoreItem {
  key: string;
  timestamp: number; // last access / save time (ms since epoch)
  data: any;
}

interface ApprovalStoreOptions {
  maxItems?: number;
  ttlMs?: number;
}

class ApprovalStore {
  private store = new Map<string, StoreItem>();
  private maxItems: number;
  private ttlMs: number;

  constructor(options?: ApprovalStoreOptions) {
    this.maxItems =
      options?.maxItems && options.maxItems > 0
        ? options.maxItems
        : DEFAULT_MAX_ITEMS;

    this.ttlMs =
      options?.ttlMs && options.ttlMs > 0 ? options.ttlMs : DEFAULT_TTL_MS;
  }

  /** Internal: check if an item is expired according to TTL. */
  private isExpired(item: StoreItem): boolean {
    const age = Date.now() - item.timestamp;
    return age > this.ttlMs;
  }

  /** Internal: remove all expired entries. */
  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, item] of this.store.entries()) {
      const age = now - item.timestamp;
      if (age > this.ttlMs) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Internal: enforce capacity limits (LRU-style).
   * Oldest entries (by timestamp) are removed first.
   */
  private enforceLimits(): void {
    this.pruneExpired();

    if (this.store.size <= this.maxItems) return;

    const items = Array.from(this.store.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    const excess = this.store.size - this.maxItems;
    for (let i = 0; i < excess; i++) {
      const victim = items[i];
      if (!victim) {
        // Nothing more to evict safely
        break;
      }
      this.store.delete(victim.key);
    }
  }

  /**
   * Save/update a value for a given key.
   * - Refreshes timestamp (acts as access for LRU)
   * - Enforces TTL and capacity limits
   */
  save(key: string, value: any): void {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing) {
      existing.timestamp = now;
      existing.data = value;
      this.store.set(key, existing);
    } else {
      const item: StoreItem = {
        key,
        timestamp: now,
        data: value,
      };
      this.store.set(key, item);
    }

    this.enforceLimits();
  }

  /**
   * Retrieve a value by key.
   * - Returns null if not found or expired
   * - Refreshes timestamp for non-expired entries (LRU behavior)
   */
  get<T = any>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (this.isExpired(item)) {
      this.store.delete(key);
      return null;
    }

    // refresh timestamp on access
    item.timestamp = Date.now();
    this.store.set(key, item);

    return (item.data as T) ?? null;
  }

  /**
   * Return all non-expired values (sorted oldest → newest).
   * Primarily intended for diagnostics and API snapshots.
   */
  getAll<T = any>(): T[] {
    this.pruneExpired();

    return Array.from(this.store.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item) => item.data as T);
  }

  /**
   * Returns a detailed snapshot of the store, including age in ms.
   * Useful for an admin/diagnostics endpoint.
   */
  snapshot(): Array<{
    key: string;
    timestamp: number;
    ageMs: number;
    data: any;
  }> {
    this.pruneExpired();
    const now = Date.now();

    return Array.from(this.store.values()).map((item) => ({
      key: item.key,
      timestamp: item.timestamp,
      ageMs: now - item.timestamp,
      data: item.data,
    }));
  }

  /** Remove all entries from the store. */
  clear(): void {
    this.store.clear();
  }

  /** Returns the current number of non-expired entries. */
  size(): number {
    this.pruneExpired();
    return this.store.size;
  }
}

/**
 * Singleton instance used by the Approvals Evaluator and API layer.
 * Default configuration:
 *  - maxItems: 500
 *  - ttlMs: 30 minutes
 */
export const approvalStore = new ApprovalStore();
