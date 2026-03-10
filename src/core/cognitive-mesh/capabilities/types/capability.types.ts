export type CapabilityFamily = "perception" | "knowledge" | "action" | "assurance";

export type CapabilityStatus =
  | "proposed"
  | "approved"
  | "active"
  | "restricted"
  | "suspended"
  | "deprecated"
  | "retired";

export type CapabilityRiskLevel = "low" | "medium" | "high" | "critical";

export type CapabilityVerificationMode = "none" | "required" | "multi_learner";

export interface CapabilityDefinition {
  capabilityId: string;
  name: string;
  family: CapabilityFamily;
  version: string;
  status: CapabilityStatus;
  description: string;
  ownerAuthority: string;
  allowedOperations: string[];
  verificationMode: CapabilityVerificationMode;
  riskLevel: CapabilityRiskLevel;
  directBrainCommitAllowed: boolean;
  monitoringProfile?: string;
  metadata?: Record<string, unknown>;
}

export interface CapabilityRegistrySnapshot {
  capabilities: CapabilityDefinition[];
  totalCount: number;
  activeCount: number;
}

