import { StructuralIndexer } from "./structural-indexer";
import type { CognitiveEvent } from "../types/cognitive-event";
import type { IndexRecord, IndexWriter } from "../types/index-record";

export class InMemoryIndexWriter implements IndexWriter {
  readonly records: IndexRecord[] = [];

  async write(_record: IndexRecord): Promise<void> {
    this.records.push(_record);
  }
}

/**
 * IndexOrchestrator coordinates sync-safe index writes.
 * Heavy indexing is intentionally scheduled for async jobs.
 */
export class IndexOrchestrator {
  constructor(
    private readonly structuralIndexer = new StructuralIndexer(),
    private readonly writer: IndexWriter = new InMemoryIndexWriter()
  ) {}

  async index(event: CognitiveEvent): Promise<IndexRecord> {
    const record = this.structuralIndexer.build(event);
    await this.writer.write(record);
    return record;
  }
}
