"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexOrchestrator = exports.NoOpIndexWriter = void 0;
const structural_indexer_1 = require("./structural-indexer");
class NoOpIndexWriter {
    async write(_record) {
        // intentionally no-op
    }
}
exports.NoOpIndexWriter = NoOpIndexWriter;
/**
 * IndexOrchestrator coordinates sync-safe index writes.
 * Heavy indexing is intentionally scheduled for async jobs.
 */
class IndexOrchestrator {
    constructor(structuralIndexer = new structural_indexer_1.StructuralIndexer(), writer = new NoOpIndexWriter()) {
        this.structuralIndexer = structuralIndexer;
        this.writer = writer;
    }
    async index(event) {
        const record = this.structuralIndexer.build(event);
        await this.writer.write(record);
        return record;
    }
}
exports.IndexOrchestrator = IndexOrchestrator;
