use crate::config::TaskConfig;
use crate::domain::types::{
    AdaptiveFlowIntake, BacklogPressureReport, ConstraintClass, ConstraintImpact,
    ConstraintMitigationSuggestion, ConstraintRecord, ConstraintSource,
    DependencyBlockingReport, Goal, GovernanceDecisionClass, PainSeverity,
    ReassignmentDirective, RetryDirective, RiskLevel, RoutingRecommendationContext, Task,
    TaskAssignment, TaskDependency, TaskFailureCluster, TaskLifecycle, TaskRoutingRequest,
    TaskRoutingResponse, TaskStatusEvent, TaskVerificationRecord, TrustPosture,
};
use crate::services::interfaces::{
    AdaptiveFlowEmitter, AdaptiveTaskTelemetry, DependencyTracker, GoalRegistry,
    ReassignmentService, RetryService, TaskKernel, TaskLifecycleService, TaskRegistry,
    TaskRouterHandoff, VerificationService,
};

#[derive(Debug, Clone)]
pub struct StubTaskKernel {
    config: TaskConfig,
}

impl StubTaskKernel {
    pub fn new(config: TaskConfig) -> Self {
        Self { config }
    }
}

impl GoalRegistry for StubTaskKernel {
    fn register_goal(&self, _goal: Goal) -> Result<(), &'static str> { Ok(()) }
    fn get_goal(&self, _goal_id: &str) -> Option<Goal> { None }
}

impl TaskRegistry for StubTaskKernel {
    fn register_task(&self, _task: Task) -> Result<(), &'static str> { Ok(()) }
    fn get_task(&self, _task_id: &str) -> Option<Task> { None }
}

impl DependencyTracker for StubTaskKernel {
    fn register_dependency(&self, _dependency: TaskDependency) -> Result<(), &'static str> { Ok(()) }
    fn dependencies_for_task(&self, _task_id: &str) -> Vec<TaskDependency> { Vec::new() }
}

impl TaskLifecycleService for StubTaskKernel {
    fn transition_task(&self, task_id: &str, lifecycle: TaskLifecycle) -> Result<TaskStatusEvent, &'static str> {
        Ok(TaskStatusEvent {
            event_id: "task-status-event".to_string(),
            task_id: task_id.to_string(),
            lifecycle,
            trace_id: None,
            evidence_ref: None,
        })
    }
}

impl RetryService for StubTaskKernel {
    fn request_retry(&self, _directive: RetryDirective) -> Result<(), &'static str> { Ok(()) }
}

impl ReassignmentService for StubTaskKernel {
    fn reassign_task(&self, directive: ReassignmentDirective) -> Result<TaskAssignment, &'static str> {
        Ok(TaskAssignment {
            assignment_id: "task-reassignment".to_string(),
            task_id: directive.task_id,
            assigned_actor_id: directive.to_actor_id,
            assigned_actor_type: "builder".to_string(),
            bounded_scope: "bounded".to_string(),
        })
    }
}

impl VerificationService for StubTaskKernel {
    fn record_verification(&self, _verification: TaskVerificationRecord) -> Result<(), &'static str> { Ok(()) }
}

impl AdaptiveTaskTelemetry for StubTaskKernel {
    fn report_backlog_pressure(&self) -> Vec<BacklogPressureReport> {
        vec![BacklogPressureReport {
            report_id: "backlog-pressure".to_string(),
            backlog_depth: 0,
            constrained_tasks: Vec::new(),
            constraint_record: ConstraintRecord {
                constraint_id: "constraint-task-backlog".to_string(),
                constraint_class: ConstraintClass::TaskBacklog,
                source: ConstraintSource::Task,
                impact: ConstraintImpact {
                    affected_task_ids: Vec::new(),
                    affected_subsystems: vec!["mak-task".to_string()],
                    bounded_scope: "bounded".to_string(),
                    severity: PainSeverity::Notice,
                },
                mitigation_suggestions: vec![ConstraintMitigationSuggestion {
                    recommendation_type: "throttle_input".to_string(),
                    rationale: "Backlog telemetry is advisory and governed.".to_string(),
                    governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
                    requires_authority_approval: false,
                    requires_survival_review: false,
                }],
                trace_id: None,
            },
        }]
    }

    fn report_task_failure_clusters(&self) -> Vec<TaskFailureCluster> {
        vec![TaskFailureCluster {
            cluster_id: "task-failure-cluster".to_string(),
            task_ids: Vec::new(),
            failure_reason: "No clustered failures recorded.".to_string(),
            constraint_record: ConstraintRecord {
                constraint_id: "constraint-dependency-block".to_string(),
                constraint_class: ConstraintClass::DependencyBlock,
                source: ConstraintSource::Task,
                impact: ConstraintImpact {
                    affected_task_ids: Vec::new(),
                    affected_subsystems: vec!["mak-task".to_string()],
                    bounded_scope: "bounded".to_string(),
                    severity: PainSeverity::Low,
                },
                mitigation_suggestions: vec![ConstraintMitigationSuggestion {
                    recommendation_type: "reroute_tasks".to_string(),
                    rationale: "Failure clusters justify review, not autonomous reassignment.".to_string(),
                    governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
                    requires_authority_approval: false,
                    requires_survival_review: false,
                }],
                trace_id: None,
            },
        }]
    }

    fn report_dependency_blocking(&self) -> Vec<DependencyBlockingReport> {
        vec![DependencyBlockingReport {
            report_id: "dependency-blocking".to_string(),
            blocked_task_id: "unknown".to_string(),
            blocking_dependency_ids: Vec::new(),
            constraint_record: ConstraintRecord {
                constraint_id: "constraint-dependency-block".to_string(),
                constraint_class: ConstraintClass::DependencyBlock,
                source: ConstraintSource::Task,
                impact: ConstraintImpact {
                    affected_task_ids: Vec::new(),
                    affected_subsystems: vec!["mak-task".to_string()],
                    bounded_scope: "bounded".to_string(),
                    severity: PainSeverity::Moderate,
                },
                mitigation_suggestions: vec![ConstraintMitigationSuggestion {
                    recommendation_type: "escalate_to_governance".to_string(),
                    rationale: "Persistent blocking requires governed review.".to_string(),
                    governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
                    requires_authority_approval: false,
                    requires_survival_review: false,
                }],
                trace_id: None,
            },
        }]
    }
}

impl TaskRouterHandoff for StubTaskKernel {
    fn build_routing_request(&self, task_id: &str) -> Result<TaskRoutingRequest, &'static str> {
        Ok(TaskRoutingRequest {
            request_id: "task-routing-request".to_string(),
            task_id: task_id.to_string(),
            task_class: "general".to_string(),
            trust_posture: TrustPosture::Guarded,
            risk_level: RiskLevel::Moderate,
            governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
            recommendation_context: Some(RoutingRecommendationContext {
                recommendation_only: true,
                constraint_classes: vec![ConstraintClass::TaskBacklog],
                suggested_responses: vec!["reroute_tasks".to_string()],
            }),
        })
    }

    fn apply_routing_response(&self, _response: TaskRoutingResponse) -> Result<(), &'static str> {
        Ok(())
    }
}

impl AdaptiveFlowEmitter for StubTaskKernel {
    fn emit_adaptive_flow(&self, _intake: AdaptiveFlowIntake) -> Result<(), &'static str> { Ok(()) }
}

impl TaskKernel for StubTaskKernel {
    fn kernel_mode(&self) -> &'static str {
        if self.config.governance_required && self.config.evidence_required {
            "governed"
        } else {
            "unbounded"
        }
    }
}
