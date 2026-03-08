"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatsRegistrySummaryCache = void 0;
class CatsRegistrySummaryCache {
    constructor(options) {
        this.cache = new Map();
        this.ttlMs = options?.ttlMs ?? 5 * 60000;
        this.maxEntries = options?.maxEntries ?? 200;
    }
    get(key) {
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
    set(key, summary) {
        if (this.cache.size >= this.maxEntries) {
            const oldest = this.cache.keys().next().value;
            if (oldest) {
                this.cache.delete(oldest);
            }
        }
        const value = { key, summary, updatedAt: new Date().toISOString() };
        this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
        return value;
    }
}
exports.CatsRegistrySummaryCache = CatsRegistrySummaryCache;
