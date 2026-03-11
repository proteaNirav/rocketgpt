import type { EvidenceReference } from "./evidence-reference";

export interface ObservationRecord {
  observationId: string;
  sourceSystem: string;
  title: string;
  evidence: EvidenceReference[];
  observedAt: string;
}
