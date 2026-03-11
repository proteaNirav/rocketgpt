export type TrustPosture =
  | "locked"
  | "guarded"
  | "normal"
  | "degraded"
  | "quarantined"
  | "safe_mode"
  | "emergency_stop";

export type BoundaryClassification =
  | "self"
  | "family"
  | "trusted_external"
  | "untrusted_external"
  | "unknown";

export type PainSeverity =
  | "notice"
  | "low"
  | "moderate"
  | "high"
  | "critical"
  | "survival";

export type ConstraintClass =
  | "builder_capacity"
  | "task_backlog"
  | "governance_latency"
  | "evidence_delay"
  | "node_degradation"
  | "runtime_pressure"
  | "os_resource_shortage"
  | "dependency_block"
  | "human_approval_delay"
  | "network_partition";

export interface TrustDescriptor {
  posture: TrustPosture;
  boundary: BoundaryClassification;
  constrainedBy: ConstraintClass[];
}

export type TrustRiskLevel = "low" | "moderate" | "high" | "critical";

export type AwarenessDriftClass =
  | "self_scope_drift"
  | "family_coordination_drift"
  | "boundary_uncertainty"
  | "unsafe_trust_posture";

export interface TrustRiskDescriptor {
  trustPosture: TrustPosture;
  riskLevel: TrustRiskLevel;
  boundary: BoundaryClassification;
  constraintClasses: ConstraintClass[];
}

export interface UnsafeTrustPostureSignal {
  actorId: string;
  trustPosture: Extract<TrustPosture, "degraded" | "quarantined" | "safe_mode" | "emergency_stop">;
  driftClass: AwarenessDriftClass;
  reason: string;
}
