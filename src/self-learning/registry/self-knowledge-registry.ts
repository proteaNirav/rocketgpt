import type { SelfLearningRegistryRecord } from "../contracts/registry-record";

export class SelfKnowledgeRegistry {
  private readonly records = new Map<string, SelfLearningRegistryRecord>();

  upsert(record: SelfLearningRegistryRecord): void {
    this.records.set(record.item.learningId, record);
  }
}
