import type { CognitiveEvent, LearningDecision, LearningGuard } from "../types/cognitive-event";
import type { ArchiveManager } from "../unlearning/archive-manager";

export interface LearningResult {
  decision: LearningDecision;
  promoted: boolean;
}

/**
 * LearningEngine coordinates guarded learning decisions.
 * It does not implement autonomous learning in this foundation.
 */
export class LearningEngine {
  constructor(
    private readonly learningGuard: LearningGuard,
    private readonly archiveManager: ArchiveManager
  ) {}

  async evaluate(event: CognitiveEvent): Promise<LearningResult> {
    const decision = await this.learningGuard.evaluate(event);
    if (decision.disposition === "archive" || decision.disposition === "reject") {
      await this.archiveManager.archiveEvent(event, decision.disposition);
      return { decision, promoted: false };
    }
    return { decision, promoted: decision.disposition === "promote" };
  }
}
