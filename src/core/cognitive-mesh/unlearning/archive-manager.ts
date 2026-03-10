import type { CognitiveEvent } from "../types/cognitive-event";

export interface ArchiveManager {
  archiveEvent(event: CognitiveEvent, reason: string): Promise<void>;
  unlearnBySession(sessionId: string, reason: string): Promise<void>;
}

/**
 * DefaultArchiveManager is intentionally side-effect free in V1.
 */
export class DefaultArchiveManager implements ArchiveManager {
  async archiveEvent(_event: CognitiveEvent, _reason: string): Promise<void> {
    // intentionally no-op
  }

  async unlearnBySession(_sessionId: string, _reason: string): Promise<void> {
    // intentionally no-op
  }
}
