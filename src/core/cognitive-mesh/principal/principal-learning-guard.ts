import type {
  CognitiveEvent,
  LearningDecision,
  LearningDisposition,
  LearningGuard,
} from "../types/cognitive-event";

/**
 * Learning guard protects long-term intelligence from unsafe ingestion.
 * Real autonomous learning remains out of scope for this foundation task.
 */
export class PrincipalLearningGuard implements LearningGuard {
  async evaluate(event: CognitiveEvent): Promise<LearningDecision> {
    const disposition = this.resolveDisposition(event);
    return {
      disposition,
      reasons: [`learning_disposition:${disposition}`],
    };
  }

  private resolveDisposition(event: CognitiveEvent): LearningDisposition {
    if (event.trustClass === "blocked" || event.trustClass === "quarantined") {
      return "reject";
    }
    if (event.trustClass === "untrusted") {
      return "archive";
    }
    if (event.trustClass === "restricted") {
      return "retain";
    }
    return "promote";
  }
}
