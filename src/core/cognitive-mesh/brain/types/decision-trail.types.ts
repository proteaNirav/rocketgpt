export interface DecisionTrailEntry {
  id: string;
  sessionId: string;
  timestamp: string;
  category: string;
  decision: string;
  rationale?: string;
  confidence?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

