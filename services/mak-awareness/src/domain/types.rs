#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SelfState {
    Stable,
    Constrained,
    Distressed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FamilyState {
    Cohesive,
    Strained,
    Fragmented,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BoundaryState {
    Clear,
    Contested,
    Breached,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AwarenessDriftClass {
    SelfScopeDrift,
    FamilyCoordinationDrift,
    BoundaryUncertainty,
    UnsafeTrustPosture,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UnsafeTrustPosture {
    Degraded,
    Quarantined,
    SafeMode,
    EmergencyStop,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SelfAwarenessRecord {
    pub actor_id: String,
    pub state: SelfState,
    pub current_scope: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FamilyAwarenessRecord {
    pub family_id: String,
    pub state: FamilyState,
    pub sister_pain_active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BoundaryAwarenessRecord {
    pub boundary_id: String,
    pub state: BoundaryState,
    pub notes: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnsafeTrustPostureSignal {
    pub actor_id: String,
    pub posture: UnsafeTrustPosture,
    pub reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AwarenessSurvivalSignal {
    pub signal_id: String,
    pub drift_class: AwarenessDriftClass,
    pub unsafe_trust: Option<UnsafeTrustPostureSignal>,
    pub recommended_survival_state: String,
    pub recommendation_only: bool,
}
