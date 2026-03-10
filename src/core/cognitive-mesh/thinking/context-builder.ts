import type { CognitiveEvent } from "../types/cognitive-event";
import type { MemoryRecord } from "../types/memory-record";

/**
 * ContextBuilder composes low-cost context text for planning.
 * This avoids expensive transforms on the request path.
 */
export class ContextBuilder {
  build(event: CognitiveEvent, memory: MemoryRecord[]): string {
    const memoryText = memory.map((item) => item.content).join("\n");
    return [
      `event_id=${event.eventId}`,
      `session_id=${event.sessionId}`,
      `trust_class=${event.trustClass}`,
      `input=${event.normalizedInput}`,
      `memory=${memoryText}`,
    ].join("\n");
  }
}
