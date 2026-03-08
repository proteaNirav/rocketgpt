"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryRetriever = void 0;
/**
 * MemoryRetriever provides a single interface over multiple memory stores.
 * Retrieval policy stays simple and deterministic in V1.
 */
class MemoryRetriever {
    constructor(stores) {
        this.stores = stores;
    }
    async retrieve(query, _event) {
        const batches = await Promise.all(this.stores.map((store) => store.get(query)));
        return batches.flat().slice(0, query.limit ?? 20);
    }
}
exports.MemoryRetriever = MemoryRetriever;
