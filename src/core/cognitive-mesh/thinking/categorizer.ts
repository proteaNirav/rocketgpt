import type { CognitiveEvent } from "../types/cognitive-event";

/**
 * Categorizer performs cheap structural bucketing only.
 * Model-assisted categorization is deferred.
 */
export class Categorizer {
  categorize(event: CognitiveEvent): string[] {
    const tags = new Set<string>();
    tags.add(`source:${event.source}`);
    tags.add(`trust:${event.trustClass}`);
    if (event.normalizedInput.length > 1000) {
      tags.add("long_form");
    }
    return [...tags];
  }
}
