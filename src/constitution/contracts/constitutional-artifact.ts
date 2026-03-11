export interface ConstitutionalCorePrincipleRecord {
  principle_id: string;
  title: string;
  lock_level: string;
  mutable: boolean;
  statement: string;
}

export interface ConstitutionalGovernedPolicyRecord {
  policy_id: string;
  title: string;
  status: string;
  effect: string;
  scope: string[];
  change_control: string;
}

export interface ConstitutionalRuntimePolicyBindingRecord {
  binding_id: string;
  source_policy_id: string;
  target_surface: string;
  mode: string;
}

export interface ConstitutionalOsPolicyEnvelopeRecord {
  customization_enabled: boolean;
  allows_local_safe_mode_preferences?: boolean;
  allows_local_retention_preferences?: boolean;
  forbids_core_principle_override: boolean;
  forbids_shared_policy_override: boolean;
}

export interface ConstitutionalArtifactV1 {
  version: number;
  constitution_id: string;
  status: string;
  active_version?: boolean;
  core_principles: ConstitutionalCorePrincipleRecord[];
  governed_policies: ConstitutionalGovernedPolicyRecord[];
  runtime_policy_bindings: ConstitutionalRuntimePolicyBindingRecord[];
  os_policy_envelope: ConstitutionalOsPolicyEnvelopeRecord;
}

export interface ConstitutionalSchemaDocument {
  $id?: string;
  required?: string[];
  type?: string;
  properties?: Record<string, ConstitutionalSchemaDocument>;
  items?: ConstitutionalSchemaDocument;
  minimum?: number;
}

export interface ConstitutionalArtifactLoadResult {
  artifactPath: string;
  schemaPath: string;
  artifact: ConstitutionalArtifactV1;
  schema: ConstitutionalSchemaDocument;
}
