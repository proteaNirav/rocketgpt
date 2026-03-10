import type { ReasoningContextEntry } from "./types/reasoning-context.types";

interface AddReasoningContextInput {
  type: string;
  label: string;
  value?: unknown;
  source?: string;
  metadata?: Record<string, unknown>;
}

export class ReasoningContext {
  private readonly entries: ReasoningContextEntry[] = [];
  private sequence = 0;

  constructor(private readonly sessionId: string) {}

  add(input: AddReasoningContextInput): ReasoningContextEntry {
    this.sequence += 1;
    const entry: ReasoningContextEntry = {
      id: `rcx-${this.sessionId}-${this.sequence}`,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      type: input.type,
      label: input.label,
      value: input.value,
      source: input.source,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };
    this.entries.push(entry);
    return entry;
  }

  list(): ReasoningContextEntry[] {
    return this.entries.map((entry) => ({
      ...entry,
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    }));
  }

  clear(): void {
    this.entries.length = 0;
  }

  snapshot(): ReasoningContextEntry[] {
    return this.list();
  }
}

