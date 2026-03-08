import type { DecisionTrailEntry } from "./types/decision-trail.types";

interface RecordDecisionInput {
  category: string;
  decision: string;
  rationale?: string;
  confidence?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

export class DecisionTrail {
  private readonly decisions: DecisionTrailEntry[] = [];
  private sequence = 0;

  constructor(private readonly sessionId: string) {}

  record(input: RecordDecisionInput): DecisionTrailEntry {
    this.sequence += 1;
    const decision: DecisionTrailEntry = {
      id: `dec-${this.sessionId}-${this.sequence}`,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      category: input.category,
      decision: input.decision,
      rationale: input.rationale,
      confidence: input.confidence,
      source: input.source,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };
    this.decisions.push(decision);
    return decision;
  }

  list(): DecisionTrailEntry[] {
    return this.decisions.map((decision) => ({
      ...decision,
      metadata: decision.metadata ? { ...decision.metadata } : undefined,
    }));
  }

  clear(): void {
    this.decisions.length = 0;
  }

  snapshot(): DecisionTrailEntry[] {
    return this.list();
  }
}

