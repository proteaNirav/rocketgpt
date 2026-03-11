use crate::config::RouterConfig;
use crate::domain::types::{
    AdaptiveFlowIntake, BuilderAssignmentAcceptance, BuilderAssignmentEnvelope,
    BuilderAssignmentRejection, BuilderCapability, BuilderDegradationReport,
    BuilderHealthState, BuilderOverloadReport, BuilderRecord, BuilderTrustPosture,
    BuilderTrustProfile, GovernanceDecisionClass, RouteConstraint, RouteConstraintImpact,
    RouteConstraintRecord, RouteDecision, RouteMitigationSuggestion, RouterPainSeverity,
    RoutingFailureReport, RuntimeEligibilityGate,
};
use crate::services::interfaces::{
    AdaptiveFlowEmitter, AdaptiveRoutingTelemetry, BuilderHandoff, BuilderRegistry,
    CapabilityIndex, FallbackRouting, HealthAwareRouting, QuarantineGuard,
    ReassignmentRouting, RouterKernel, RuntimeEligibility, TrustAwareRouting,
};

#[derive(Debug, Clone)]
pub struct StubRouterKernel {
    config: RouterConfig,
}

impl StubRouterKernel {
    pub fn new(config: RouterConfig) -> Self {
        Self { config }
    }
}

impl BuilderRegistry for StubRouterKernel {
    fn register_builder(&self, _builder: BuilderRecord) -> Result<(), &'static str> { Ok(()) }
    fn get_builder(&self, _builder_id: &str) -> Option<BuilderRecord> { None }
}

impl CapabilityIndex for StubRouterKernel {
    fn list_capabilities(&self, _builder_id: &str) -> Vec<BuilderCapability> { Vec::new() }
}

impl TrustAwareRouting for StubRouterKernel {
    fn route_task(&self, task_id: &str, _required_capability: &str, constraints: &[RouteConstraint]) -> Result<RouteDecision, &'static str> {
        Ok(RouteDecision {
            route_id: "route-decision".to_string(),
            task_id: task_id.to_string(),
            builder_id: None,
            decision_class: GovernanceDecisionClass::ApprovalRequired,
            constraints: constraints.to_vec(),
        })
    }
}

impl HealthAwareRouting for StubRouterKernel {
    fn check_health_eligibility(&self, _builder_id: &str) -> Result<(), &'static str> { Ok(()) }
}

impl FallbackRouting for StubRouterKernel {
    fn fallback_route(&self, task_id: &str, constraints: &[RouteConstraint]) -> Result<RouteDecision, &'static str> {
        Ok(RouteDecision {
            route_id: "fallback-route".to_string(),
            task_id: task_id.to_string(),
            builder_id: None,
            decision_class: GovernanceDecisionClass::BoundedAllow,
            constraints: constraints.to_vec(),
        })
    }
}

impl ReassignmentRouting for StubRouterKernel {
    fn reassign_route(&self, task_id: &str, _previous_builder_id: Option<&str>) -> Result<RouteDecision, &'static str> {
        Ok(RouteDecision {
            route_id: "reassignment-route".to_string(),
            task_id: task_id.to_string(),
            builder_id: None,
            decision_class: GovernanceDecisionClass::ApprovalRequired,
            constraints: vec![RouteConstraint::DependencyBlock],
        })
    }
}

impl QuarantineGuard for StubRouterKernel {
    fn trust_profile(&self, builder_id: &str) -> Option<BuilderTrustProfile> {
        Some(BuilderTrustProfile {
            builder_id: builder_id.to_string(),
            posture: BuilderTrustPosture::Guarded,
            bounded_scope: "bounded".to_string(),
        })
    }
}

impl AdaptiveRoutingTelemetry for StubRouterKernel {
    fn report_builder_overload(&self) -> Vec<BuilderOverloadReport> {
        vec![BuilderOverloadReport {
            report_id: "builder-overload".to_string(),
            builder_id: "unknown".to_string(),
            active_assignment_count: 0,
            constraint_record: RouteConstraintRecord {
                constraint_id: "constraint-builder-capacity".to_string(),
                constraint_class: RouteConstraint::BuilderCapacity,
                impact: RouteConstraintImpact {
                    affected_builder_ids: Vec::new(),
                    affected_subsystems: vec!["mak-router".to_string()],
                    bounded_scope: "bounded".to_string(),
                    severity: RouterPainSeverity::Notice,
                },
                mitigation_suggestions: vec![RouteMitigationSuggestion {
                    recommendation_type: "reroute_tasks".to_string(),
                    rationale: "Overload reports are advisory.".to_string(),
                    governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
                    requires_authority_approval: false,
                    requires_survival_review: false,
                }],
                trace_id: None,
            },
        }]
    }

    fn report_builder_degradation(&self) -> Vec<BuilderDegradationReport> {
        vec![BuilderDegradationReport {
            report_id: "builder-degradation".to_string(),
            builder_id: "unknown".to_string(),
            health_state: BuilderHealthState::Degraded,
            constraint_record: RouteConstraintRecord {
                constraint_id: "constraint-node-degradation".to_string(),
                constraint_class: RouteConstraint::NodeDegradation,
                impact: RouteConstraintImpact {
                    affected_builder_ids: Vec::new(),
                    affected_subsystems: vec!["mak-router".to_string()],
                    bounded_scope: "bounded".to_string(),
                    severity: RouterPainSeverity::Moderate,
                },
                mitigation_suggestions: vec![RouteMitigationSuggestion {
                    recommendation_type: "send_sister_support".to_string(),
                    rationale: "Degraded builders should trigger review.".to_string(),
                    governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
                    requires_authority_approval: false,
                    requires_survival_review: true,
                }],
                trace_id: None,
            },
        }]
    }

    fn report_routing_failures(&self) -> Vec<RoutingFailureReport> {
        vec![RoutingFailureReport {
            report_id: "routing-failure".to_string(),
            task_id: "unknown".to_string(),
            attempted_builder_ids: Vec::new(),
            failure_reason: "No eligible builder accepted the task.".to_string(),
            constraint_record: RouteConstraintRecord {
                constraint_id: "constraint-network-partition".to_string(),
                constraint_class: RouteConstraint::NetworkPartition,
                impact: RouteConstraintImpact {
                    affected_builder_ids: Vec::new(),
                    affected_subsystems: vec!["mak-router".to_string()],
                    bounded_scope: "bounded".to_string(),
                    severity: RouterPainSeverity::High,
                },
                mitigation_suggestions: vec![RouteMitigationSuggestion {
                    recommendation_type: "escalate_to_governance".to_string(),
                    rationale: "Repeated routing failure requires governed fallback review.".to_string(),
                    governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
                    requires_authority_approval: false,
                    requires_survival_review: true,
                }],
                trace_id: None,
            },
        }]
    }
}

impl BuilderHandoff for StubRouterKernel {
    fn build_assignment_envelope(&self, task_id: &str, required_capability: &str) -> Result<BuilderAssignmentEnvelope, &'static str> {
        Ok(BuilderAssignmentEnvelope {
            assignment_id: "builder-assignment".to_string(),
            task_id: task_id.to_string(),
            builder_id: None,
            requested_capability: required_capability.to_string(),
            bounded_scope: "bounded".to_string(),
            trust_posture: BuilderTrustPosture::Guarded,
            builder_health_state: BuilderHealthState::Constrained,
            governance_decision_class: GovernanceDecisionClass::ApprovalRequired,
        })
    }

    fn accept_assignment(&self, _acceptance: BuilderAssignmentAcceptance) -> Result<(), &'static str> { Ok(()) }
    fn reject_assignment(&self, _rejection: BuilderAssignmentRejection) -> Result<(), &'static str> { Ok(()) }
}

impl RuntimeEligibility for StubRouterKernel {
    fn runtime_eligibility_for(&self, _task_id: &str) -> Vec<RuntimeEligibilityGate> {
        vec![RuntimeEligibilityGate {
            target_surface: "sandbox_runner".to_string(),
            decision_class: GovernanceDecisionClass::ApprovalRequired,
            eligibility: "bounded".to_string(),
            policy_refs: vec!["mishti.runtime.sandbox.first-life".to_string()],
        }]
    }
}

impl AdaptiveFlowEmitter for StubRouterKernel {
    fn emit_adaptive_flow(&self, _intake: AdaptiveFlowIntake) -> Result<(), &'static str> { Ok(()) }
}

impl RouterKernel for StubRouterKernel {
    fn kernel_mode(&self) -> &'static str {
        if self.config.zero_trust_required && self.config.quarantine_guard_enabled {
            "zero-trust-governed"
        } else {
            "unguarded"
        }
    }
}
