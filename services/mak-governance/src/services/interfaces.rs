use crate::domain::types::{
    ConstitutionRecord, GovernanceMode, PolicyRecord, ProposalRecord, SnapshotRecord,
};

pub trait GovernanceKernel {
    fn current_mode(&self) -> GovernanceMode;
    fn load_constitution(&self) -> ConstitutionRecord;
    fn register_policy(&self, policy: PolicyRecord) -> Result<(), &'static str>;
    fn submit_proposal(&self, proposal: ProposalRecord) -> Result<(), &'static str>;
    fn capture_snapshot(&self, snapshot: SnapshotRecord) -> Result<(), &'static str>;
}
