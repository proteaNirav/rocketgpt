#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuilderTrustPosture {
    Locked,
    Guarded,
    Normal,
    Degraded,
    Quarantined,
    SafeMode,
    EmergencyStop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BuilderHealthState {
    Healthy,
    Constrained,
    Degraded,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GovernanceDecisionClass {
    Allow,
    BoundedAllow,
    Deny,
    ApprovalRequired,
    EmergencyStop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RouteConstraint {
    BuilderCapacity,
    TaskBacklog,
    GovernanceLatency,
    EvidenceDelay,
    NodeDegradation,
    RuntimePressure,
    OsResourceShortage,
    DependencyBlock,
    HumanApprovalDelay,
    NetworkPartition,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderCapability {
    pub capability_id: String,
    pub capability_name: String,
    pub bounded_scope: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderTrustProfile {
    pub builder_id: String,
    pub posture: BuilderTrustPosture,
    pub bounded_scope: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderRecord {
    pub builder_id: String,
    pub actor_type: String,
    pub trust_profile: BuilderTrustProfile,
    pub health_state: BuilderHealthState,
    pub capabilities: Vec<BuilderCapability>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteDecision {
    pub route_id: String,
    pub task_id: String,
    pub builder_id: Option<String>,
    pub decision_class: GovernanceDecisionClass,
    pub constraints: Vec<RouteConstraint>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RouterPainSeverity {
    Notice,
    Low,
    Moderate,
    High,
    Critical,
    Survival,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteConstraintImpact {
    pub affected_builder_ids: Vec<String>,
    pub affected_subsystems: Vec<String>,
    pub bounded_scope: String,
    pub severity: RouterPainSeverity,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteMitigationSuggestion {
    pub recommendation_type: String,
    pub rationale: String,
    pub governance_decision_class: GovernanceDecisionClass,
    pub requires_authority_approval: bool,
    pub requires_survival_review: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouteConstraintRecord {
    pub constraint_id: String,
    pub constraint_class: RouteConstraint,
    pub impact: RouteConstraintImpact,
    pub mitigation_suggestions: Vec<RouteMitigationSuggestion>,
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderOverloadReport {
    pub report_id: String,
    pub builder_id: String,
    pub active_assignment_count: u32,
    pub constraint_record: RouteConstraintRecord,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderDegradationReport {
    pub report_id: String,
    pub builder_id: String,
    pub health_state: BuilderHealthState,
    pub constraint_record: RouteConstraintRecord,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RoutingFailureReport {
    pub report_id: String,
    pub task_id: String,
    pub attempted_builder_ids: Vec<String>,
    pub failure_reason: String,
    pub constraint_record: RouteConstraintRecord,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderAssignmentEnvelope {
    pub assignment_id: String,
    pub task_id: String,
    pub builder_id: Option<String>,
    pub requested_capability: String,
    pub bounded_scope: String,
    pub trust_posture: BuilderTrustPosture,
    pub builder_health_state: BuilderHealthState,
    pub governance_decision_class: GovernanceDecisionClass,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderAssignmentAcceptance {
    pub assignment_id: String,
    pub builder_id: String,
    pub accepted_capability: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuilderAssignmentRejection {
    pub assignment_id: String,
    pub builder_id: String,
    pub reason_code: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeEligibilityGate {
    pub target_surface: String,
    pub decision_class: GovernanceDecisionClass,
    pub eligibility: String,
    pub policy_refs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdaptiveFlowIntake {
    pub intake_id: String,
    pub source_subsystem: String,
    pub pain_summary: Option<String>,
    pub recommendation_only: bool,
}
