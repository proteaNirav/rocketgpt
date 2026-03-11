#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskLifecycle {
    Created,
    Queued,
    Assigned,
    Executing,
    Completed,
    Verified,
    Failed,
    Suspended,
    Archived,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VerificationState {
    Pending,
    Verified,
    Rejected,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DependencyState {
    Pending,
    Satisfied,
    Blocked,
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
pub enum TrustPosture {
    Locked,
    Guarded,
    Normal,
    Degraded,
    Quarantined,
    SafeMode,
    EmergencyStop,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RiskLevel {
    Low,
    Moderate,
    High,
    Critical,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConstraintSource {
    Task,
    Governance,
    Evidence,
    Human,
    Network,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConstraintClass {
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PainSeverity {
    Notice,
    Low,
    Moderate,
    High,
    Critical,
    Survival,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Goal {
    pub goal_id: String,
    pub title: String,
    pub trace_id: Option<String>,
    pub contract_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Task {
    pub task_id: String,
    pub goal_id: String,
    pub title: String,
    pub lifecycle: TaskLifecycle,
    pub bounded_scope: String,
    pub trace_id: Option<String>,
    pub contract_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SubTask {
    pub sub_task_id: String,
    pub parent_task_id: String,
    pub title: String,
    pub lifecycle: TaskLifecycle,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskDependency {
    pub dependency_id: String,
    pub task_id: String,
    pub depends_on_task_id: String,
    pub state: DependencyState,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskAssignment {
    pub assignment_id: String,
    pub task_id: String,
    pub assigned_actor_id: String,
    pub assigned_actor_type: String,
    pub bounded_scope: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskStatusEvent {
    pub event_id: String,
    pub task_id: String,
    pub lifecycle: TaskLifecycle,
    pub trace_id: Option<String>,
    pub evidence_ref: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskVerificationRecord {
    pub verification_id: String,
    pub task_id: String,
    pub state: VerificationState,
    pub verifier_actor_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RetryDirective {
    pub task_id: String,
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReassignmentDirective {
    pub task_id: String,
    pub from_actor_id: Option<String>,
    pub to_actor_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConstraintImpact {
    pub affected_task_ids: Vec<String>,
    pub affected_subsystems: Vec<String>,
    pub bounded_scope: String,
    pub severity: PainSeverity,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConstraintMitigationSuggestion {
    pub recommendation_type: String,
    pub rationale: String,
    pub governance_decision_class: GovernanceDecisionClass,
    pub requires_authority_approval: bool,
    pub requires_survival_review: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConstraintRecord {
    pub constraint_id: String,
    pub constraint_class: ConstraintClass,
    pub source: ConstraintSource,
    pub impact: ConstraintImpact,
    pub mitigation_suggestions: Vec<ConstraintMitigationSuggestion>,
    pub trace_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BacklogPressureReport {
    pub report_id: String,
    pub backlog_depth: u32,
    pub constrained_tasks: Vec<String>,
    pub constraint_record: ConstraintRecord,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskFailureCluster {
    pub cluster_id: String,
    pub task_ids: Vec<String>,
    pub failure_reason: String,
    pub constraint_record: ConstraintRecord,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DependencyBlockingReport {
    pub report_id: String,
    pub blocked_task_id: String,
    pub blocking_dependency_ids: Vec<String>,
    pub constraint_record: ConstraintRecord,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RoutingRecommendationContext {
    pub recommendation_only: bool,
    pub constraint_classes: Vec<ConstraintClass>,
    pub suggested_responses: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskRoutingRequest {
    pub request_id: String,
    pub task_id: String,
    pub task_class: String,
    pub trust_posture: TrustPosture,
    pub risk_level: RiskLevel,
    pub governance_decision_class: GovernanceDecisionClass,
    pub recommendation_context: Option<RoutingRecommendationContext>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskRoutingResponse {
    pub request_id: String,
    pub route_id: Option<String>,
    pub eligibility: String,
    pub governance_decision_class: GovernanceDecisionClass,
    pub recommendation_context: Option<RoutingRecommendationContext>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AdaptiveFlowIntake {
    pub intake_id: String,
    pub source_subsystem: String,
    pub pain_summary: Option<String>,
    pub constraint_record: Option<ConstraintRecord>,
    pub recommendation_only: bool,
}
