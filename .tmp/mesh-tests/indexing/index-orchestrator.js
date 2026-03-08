"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexOrchestrator = exports.InMemoryIndexWriter = void 0;
const structural_indexer_1 = require("./structural-indexer");
class InMemoryIndexWriter {
    constructor() {
        this.records = [];
    }
    async write(_record) {
        this.records.push(_record);
    }
}
exports.InMemoryIndexWriter = InMemoryIndexWriter;
/**
 * IndexOrchestrator coordinates sync-safe index writes.
 * Heavy indexing is intentionally scheduled for async jobs.
 */
class IndexOrchestrator {
    constructor(structuralIndexer = new structural_indexer_1.StructuralIndexer(), writer = new InMemoryIndexWriter()) {
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
