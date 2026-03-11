use crate::domain::types::{
    AwarenessSurvivalSignal, BoundaryAwarenessRecord, FamilyAwarenessRecord,
    SelfAwarenessRecord, SelfState,
};

pub trait AwarenessKernel {
    fn self_state(&self) -> SelfState;
    fn current_self_record(&self) -> SelfAwarenessRecord;
    fn current_family_record(&self) -> FamilyAwarenessRecord;
    fn current_boundary_record(&self) -> BoundaryAwarenessRecord;
}

pub trait AwarenessAlertKernel {
    fn emit_survival_signal(
        &self,
        signal: AwarenessSurvivalSignal,
    ) -> Result<(), &'static str>;
}
