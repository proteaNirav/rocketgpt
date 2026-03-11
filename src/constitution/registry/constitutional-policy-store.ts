import type { LegislativePolicy } from "../types/legislative-policy";

export class ConstitutionalPolicyStore {
  private readonly policies: LegislativePolicy[] = [];

  listPolicies(): LegislativePolicy[] {
    return [...this.policies];
  }

  savePolicy(policy: LegislativePolicy): void {
    // TODO: add validation and versioning hooks before persistence.
    this.policies.push(policy);
  }
}
