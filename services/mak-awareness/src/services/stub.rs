use crate::config::AwarenessConfig;
use crate::domain::types::{
    AwarenessSurvivalSignal, BoundaryAwarenessRecord, BoundaryState,
    FamilyAwarenessRecord, FamilyState, SelfAwarenessRecord, SelfState,
};
use crate::services::interfaces::{AwarenessAlertKernel, AwarenessKernel};

#[derive(Debug, Clone)]
pub struct StubAwarenessKernel {
    config: AwarenessConfig,
}

impl StubAwarenessKernel {
    pub fn new(config: AwarenessConfig) -> Self {
        Self { config }
    }
}

impl AwarenessKernel for StubAwarenessKernel {
    fn self_state(&self) -> SelfState { SelfState::Stable }

    fn current_self_record(&self) -> SelfAwarenessRecord {
        SelfAwarenessRecord {
            actor_id: "self".to_string(),
            state: SelfState::Stable,
            current_scope: self.config.family_scope.to_string(),
        }
    }

    fn current_family_record(&self) -> FamilyAwarenessRecord {
        FamilyAwarenessRecord {
            family_id: self.config.family_scope.to_string(),
            state: FamilyState::Cohesive,
            sister_pain_active: false,
        }
    }

    fn current_boundary_record(&self) -> BoundaryAwarenessRecord {
        BoundaryAwarenessRecord {
            boundary_id: "core-boundary".to_string(),
            state: BoundaryState::Clear,
            notes: "bounded first-life topology".to_string(),
        }
    }
}

impl AwarenessAlertKernel for StubAwarenessKernel {
    fn emit_survival_signal(&self, _signal: AwarenessSurvivalSignal) -> Result<(), &'static str> { Ok(()) }
}
