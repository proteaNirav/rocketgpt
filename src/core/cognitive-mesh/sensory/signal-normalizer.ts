import type { CognitiveSourceType } from "../types/cognitive-event";

/**
 * SignalNormalizer keeps request-path input shaping deterministic and cheap.
 * Advanced cleaning/semantic extraction is intentionally deferred.
 */
export class SignalNormalizer {
  normalize(input: unknown, sourceType: CognitiveSourceType = "unknown"): string {
    if (sourceType === "chat.user_text" && typeof input === "object" && input !== null) {
      const candidate = (input as Record<string, unknown>).text;
      if (typeof candidate === "string") {
        return candidate.trim();
      }
    }

    if (typeof input === "string") {
      return input.trim();
    }
    if (input === null || input === undefined) {
      return "";
    }
    try {
      return JSON.stringify(input);
    } catch {
      return String(input);
    }
  }
}
