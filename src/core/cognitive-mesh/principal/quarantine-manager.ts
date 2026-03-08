import type { CognitiveEvent } from "../types/cognitive-event";

export interface QuarantineManager {
  quarantine(event: CognitiveEvent, reasons: string[]): Promise<string>;
}

/**
 * DefaultQuarantineManager is a no-op placeholder.
 * It returns deterministic ids and does not persist globally in V1.
 */
export class DefaultQuarantineManager implements QuarantineManager {
  async quarantine(event: CognitiveEvent, _reasons: string[]): Promise<string> {
    return `q_${event.eventId}`;
  }
}
