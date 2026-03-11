use crate::domain::types::{
    AdaptiveFlowIntake, BuilderAssignmentAcceptance, BuilderAssignmentEnvelope,
    BuilderAssignmentRejection, BuilderCapability, BuilderDegradationReport,
    BuilderOverloadReport, BuilderRecord, BuilderTrustProfile, RouteConstraint,
    RouteDecision, RoutingFailureReport, RuntimeEligibilityGate,
};

pub trait BuilderRegistry {
    fn register_builder(&self, builder: BuilderRecord) -> Result<(), &'static str>;
    fn get_builder(&self, builder_id: &str) -> Option<BuilderRecord>;
}

pub trait CapabilityIndex {
    fn list_capabilities(&self, builder_id: &str) -> Vec<BuilderCapability>;
}

pub trait TrustAwareRouting {
    fn route_task(
        &self,
        task_id: &str,
        required_capability: &str,
        constraints: &[RouteConstraint],
    ) -> Result<RouteDecision, &'static str>;
}

pub trait HealthAwareRouting {
    fn check_health_eligibility(&self, builder_id: &str) -> Result<(), &'static str>;
}

pub trait FallbackRouting {
    fn fallback_route(
        &self,
        task_id: &str,
        constraints: &[RouteConstraint],
    ) -> Result<RouteDecision, &'static str>;
}

pub trait ReassignmentRouting {
    fn reassign_route(
        &self,
        task_id: &str,
        previous_builder_id: Option<&str>,
    ) -> Result<RouteDecision, &'static str>;
}

pub trait QuarantineGuard {
    fn trust_profile(&self, builder_id: &str) -> Option<BuilderTrustProfile>;
}

pub trait AdaptiveRoutingTelemetry {
    fn report_builder_overload(&self) -> Vec<BuilderOverloadReport>;
    fn report_builder_degradation(&self) -> Vec<BuilderDegradationReport>;
    fn report_routing_failures(&self) -> Vec<RoutingFailureReport>;
}

pub trait BuilderHandoff {
    fn build_assignment_envelope(
        &self,
        task_id: &str,
        required_capability: &str,
    ) -> Result<BuilderAssignmentEnvelope, &'static str>;
    fn accept_assignment(
        &self,
        acceptance: BuilderAssignmentAcceptance,
    ) -> Result<(), &'static str>;
    fn reject_assignment(
        &self,
        rejection: BuilderAssignmentRejection,
    ) -> Result<(), &'static str>;
}

pub trait RuntimeEligibility {
    fn runtime_eligibility_for(&self, task_id: &str) -> Vec<RuntimeEligibilityGate>;
}

pub trait AdaptiveFlowEmitter {
    fn emit_adaptive_flow(&self, intake: AdaptiveFlowIntake) -> Result<(), &'static str>;
}

pub trait RouterKernel:
    BuilderRegistry
    + CapabilityIndex
    + TrustAwareRouting
    + HealthAwareRouting
    + FallbackRouting
    + ReassignmentRouting
    + QuarantineGuard
    + AdaptiveRoutingTelemetry
    + BuilderHandoff
    + RuntimeEligibility
    + AdaptiveFlowEmitter
{
    fn kernel_mode(&self) -> &'static str;
}
