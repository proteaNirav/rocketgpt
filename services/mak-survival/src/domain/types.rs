#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SurvivalState {
    Normal,
    SafeMode,
    EmergencyStopPending,
    EmergencyStopped,
    RecoveryOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IsolationState {
    Connected,
    Isolated,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SurvivalRecommendation {
    Monitor,
    SafeModeReview,
    EmergencyStopReview,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SurvivalStatus {
    pub state: SurvivalState,
    pub isolation: IsolationState,
    pub kill_switch_reachable: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmergencyCommand {
    pub command_id: String,
    pub initiated_by: String,
    pub justification: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AwarenessSafetyAlert {
    pub alert_id: String,
    pub drift_class: String,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceSafetyAlert {
    pub alert_id: String,
    pub source: String,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GovernanceRuntimeGate {
    pub gate_id: String,
    pub decision_class: String,
    pub target_surface: String,
    pub eligibility: String,
}
