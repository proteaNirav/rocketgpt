use crate::domain::types::{
    AwarenessSafetyAlert, EmergencyCommand, EvidenceSafetyAlert, GovernanceRuntimeGate,
    SurvivalRecommendation, SurvivalState, SurvivalStatus,
};

pub trait SurvivalKernel {
    fn current_state(&self) -> SurvivalState;
    fn current_status(&self) -> SurvivalStatus;
    fn enter_safe_mode(&self) -> Result<(), &'static str>;
    fn emergency_stop(&self, command: EmergencyCommand) -> Result<(), &'static str>;
}

pub trait SurvivalSignalKernel {
    fn review_awareness_alert(
        &self,
        alert: AwarenessSafetyAlert,
    ) -> SurvivalRecommendation;
    fn review_evidence_alert(
        &self,
        alert: EvidenceSafetyAlert,
    ) -> SurvivalRecommendation;
    fn review_runtime_gate(&self, gate: GovernanceRuntimeGate) -> SurvivalRecommendation;
}
