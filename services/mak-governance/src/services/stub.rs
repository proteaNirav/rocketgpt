use crate::config::GovernanceConfig;
use crate::domain::types::{
    ConstitutionRecord, ConstitutionState, GovernanceMode, PolicyRecord, ProposalRecord,
    SnapshotRecord,
};
use crate::services::interfaces::GovernanceKernel;

#[derive(Debug, Clone)]
pub struct StubGovernanceKernel {
    config: GovernanceConfig,
}

impl StubGovernanceKernel {
    pub fn new(config: GovernanceConfig) -> Self {
        Self { config }
    }
}

impl GovernanceKernel for StubGovernanceKernel {
    fn current_mode(&self) -> GovernanceMode {
        match self.config.default_mode {
            "guarded" => GovernanceMode::Guarded,
            "emergency" => GovernanceMode::Emergency,
            "recovery_only" => GovernanceMode::RecoveryOnly,
            _ => GovernanceMode::Normal,
        }
    }

    fn load_constitution(&self) -> ConstitutionRecord {
        ConstitutionRecord {
            constitution_id: "constitution-v1".to_string(),
            version: self.config.constitution_version.to_string(),
            state: ConstitutionState::Active,
        }
    }

    fn register_policy(&self, _policy: PolicyRecord) -> Result<(), &'static str> {
        Ok(())
    }

    fn submit_proposal(&self, _proposal: ProposalRecord) -> Result<(), &'static str> {
        Ok(())
    }

    fn capture_snapshot(&self, _snapshot: SnapshotRecord) -> Result<(), &'static str> {
        Ok(())
    }
}
