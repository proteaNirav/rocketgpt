"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchiveMemory = void 0;
/**
 * ArchiveMemory is a non-authoritative placeholder for long-term retention.
 * Real durable storage integration is deferred by design.
 */
class ArchiveMemory {
    async put(_record) {
        // intentionally no-op in V1 foundation
    }
    async get(_query) {
        return [];
    }
}
exports.ArchiveMemory = ArchiveMemory;
