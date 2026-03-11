import type { ObservationRecord } from "../types/observation-record";

export class SelfObservationIngestor {
  ingest(_observation: ObservationRecord): void {
    // TODO: normalize, deduplicate, and stage observation records for review.
  }
}
