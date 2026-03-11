export interface ProposalDraft {
  title: string;
  summary: string;
  targetLayer: "core_principle" | "legislative_policy" | "runtime_binding" | "os_policy_envelope";
  evidenceRefs: string[];
}
