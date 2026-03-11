import type { SelfKnowledgeSnapshot } from "../types/self-knowledge-snapshot";

export class SnapshotPublisher {
  publish(_snapshot: SelfKnowledgeSnapshot): void {
    // TODO: persist versioned snapshot artifacts through governed publication.
  }
}
