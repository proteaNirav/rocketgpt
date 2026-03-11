use crate::config::SurvivalConfig;
use crate::domain::types::{
    AwarenessSafetyAlert, EmergencyCommand, EvidenceSafetyAlert, GovernanceRuntimeGate,
    IsolationState, SurvivalRecommendation, SurvivalState, SurvivalStatus,
};
use crate::services::interfaces::{SurvivalKernel, SurvivalSignalKernel};

#[derive(Debug, Clone)]
pub struct StubSurvivalKernel {
    config: SurvivalConfig,
}

impl StubSurvivalKernel {
    pub fn new(config: SurvivalConfig) -> Self {
        Self { config }
    }
}

impl SurvivalKernel for StubSurvivalKernel {
    fn current_state(&self) -> SurvivalState {
        match self.config.default_state {
            "safe_mode" => SurvivalState::SafeMode,
            "emergency_stop_pending" => SurvivalState::EmergencyStopPending,
            "emergency_stopped" => SurvivalState::EmergencyStopped,
            "recovery_only" => SurvivalState::RecoveryOnly,
            _ => SurvivalState::Normal,
        }
    }

    fn current_status(&self) -> SurvivalStatus {
        SurvivalStatus {
            state: self.current_state(),
            isolation: IsolationState::Connected,
            kill_switch_reachable: true,
        }
    }

    fn enter_safe_mode(&self) -> Result<(), &'static str> { Ok(()) }
    fn emergency_stop(&self, _command: EmergencyCommand) -> Result<(), &'static str> { Ok(()) }
}

impl SurvivalSignalKernel for StubSurvivalKernel {
    fn review_awareness_alert(&self, _alert: AwarenessSafetyAlert) -> SurvivalRecommendation {
        SurvivalRecommendation::SafeModeReview
    }

    fn review_evidence_alert(&self, _alert: EvidenceSafetyAlert) -> SurvivalRecommendation {
        SurvivalRecommendation::Monitor
    }

    fn review_runtime_gate(&self, _gate: GovernanceRuntimeGate) -> SurvivalRecommendation {
        SurvivalRecommendation::Monitor
    }
}
