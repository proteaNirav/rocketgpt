export interface RuntimePolicyBinding {
  bindingId: string;
  sourcePolicyId: string;
  targetSurface: string;
  mode: "derived" | "bounded_override";
  active: boolean;
}
