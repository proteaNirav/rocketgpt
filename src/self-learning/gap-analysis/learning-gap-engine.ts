import type { ObservationRecord } from "../types/observation-record";

export class LearningGapEngine {
  deriveFromObservations(_observations: ObservationRecord[]): void {
    // TODO: infer gaps from repeated failure, contradiction, stale evidence, and repair difficulty.
  }
}
