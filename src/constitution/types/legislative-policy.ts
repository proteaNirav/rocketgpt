export interface LegislativePolicy {
  policyId: string;
  title: string;
  scope: string[];
  status: "proposed" | "active" | "deprecated";
  changeControl: "governed_amendment" | "restricted_amendment";
}
