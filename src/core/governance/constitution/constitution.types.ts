export interface RocketGptConstitutionPrincipleV1 {
  id:
    | "governed_existence"
    | "continuity_preservation"
    | "reality_alignment"
    | "self_awareness"
    | "observational_learning"
    | "trusted_steward_recognition_and_protection";
  priority: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  description: string;
  constraints: string[];
}

export interface RocketGptConstitutionDocumentV1 {
  version: 1;
  name: "RocketGPT Constitutional Brain Layer";
  status: "defined";
  enforcement_mode: "deferred_phased_rollout";
  principles: RocketGptConstitutionPrincipleV1[];
}
