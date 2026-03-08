export interface ReasoningContextEntry {
  id: string;
  sessionId: string;
  timestamp: string;
  type: string;
  label: string;
  value?: unknown;
  source?: string;
  metadata?: Record<string, unknown>;
}

