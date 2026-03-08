import type { RiskScore, TrustClass } from "../types/cognitive-event";

/**
 * RiskScorer returns a bounded baseline score so guardrails can execute
 * consistently while deeper risk modeling is deferred.
 */
export class RiskScorer {
  scoreFor(trustClass: TrustClass, normalizedInput = ""): RiskScore {
    const now = new Date().toISOString();
    const map: Record<TrustClass, number> = {
      trusted: 10,
      restricted: 35,
      untrusted: 65,
      quarantined: 90,
      evidence_only: 80,
      blocked: 100,
    };
    const reasons = [`baseline:${trustClass}`];
    let score = map[trustClass];

    if (normalizedInput.length > 6000) {
      score = Math.min(100, score + 15);
      reasons.push("long_input");
    }
    if (/[<>{}]/.test(normalizedInput)) {
      score = Math.min(100, score + 5);
      reasons.push("special_tokens_present");
    }

    return { score, reasons, evaluatedAt: now };
  }
}
