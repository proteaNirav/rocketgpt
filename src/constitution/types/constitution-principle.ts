export interface ConstitutionPrinciple {
  principleId: string;
  title: string;
  statement: string;
  lockLevel: "protected" | "restricted" | "governed";
  mutable: boolean;
}
