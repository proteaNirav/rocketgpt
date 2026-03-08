import type { TrustClass } from "../types/cognitive-event";

/**
 * TrustClassifier is intentionally heuristic-free for V1 foundation.
 * It only maps explicit metadata hints and defaults to restricted.
 */
export class TrustClassifier {
  classify(source: string, metadata?: Record<string, unknown>): TrustClass {
    const hinted = metadata?.trustClass;
    if (
      hinted === "trusted" ||
      hinted === "restricted" ||
      hinted === "untrusted" ||
      hinted === "quarantined" ||
      hinted === "evidence_only" ||
      hinted === "blocked"
    ) {
      return hinted;
    }

    if (source.startsWith("internal:")) {
      return "trusted";
    }
    return "restricted";
  }
}
