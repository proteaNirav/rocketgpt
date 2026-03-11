#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GovernanceMode {
    Normal,
    Guarded,
    Emergency,
    RecoveryOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConstitutionState {
    Draft,
    Approved,
    Active,
    Suspended,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProposalState {
    Draft,
    Submitted,
    Approved,
    Rejected,
    Activated,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SnapshotState {
    Captured,
    Verified,
    Restored,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConstitutionRecord {
    pub constitution_id: String,
    pub version: String,
    pub state: ConstitutionState,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PolicyRecord {
    pub policy_id: String,
    pub name: String,
    pub active: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProposalRecord {
    pub proposal_id: String,
    pub title: String,
    pub state: ProposalState,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SnapshotRecord {
    pub snapshot_id: String,
    pub basis_ref: String,
    pub state: SnapshotState,
}
