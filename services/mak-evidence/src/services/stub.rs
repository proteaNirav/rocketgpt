use crate::config::EvidenceConfig;
use crate::domain::types::{
    AppendOnlyEvent, ChainMode, EvidenceGapAlert, EvidenceReceipt, HashChainCheckpoint,
    LineageInconsistencyAlert, ResultEvidenceAttachment,
};
use crate::services::interfaces::{
    EvidenceAlertKernel, EvidenceAttachmentKernel, EvidenceKernel,
};

#[derive(Debug, Clone)]
pub struct StubEvidenceKernel {
    config: EvidenceConfig,
}

impl StubEvidenceKernel {
    pub fn new(config: EvidenceConfig) -> Self {
        Self { config }
    }
}

impl EvidenceKernel for StubEvidenceKernel {
    fn chain_mode(&self) -> ChainMode {
        match self.config.anchor_policy {
            "quarantined" => ChainMode::Quarantined,
            _ => ChainMode::AppendOnly,
        }
    }

    fn append_event(&self, _event: AppendOnlyEvent) -> Result<(), &'static str> { Ok(()) }
    fn issue_receipt(&self, _receipt: EvidenceReceipt) -> Result<(), &'static str> { Ok(()) }

    fn latest_checkpoint(&self) -> HashChainCheckpoint {
        HashChainCheckpoint {
            checkpoint_id: "genesis".to_string(),
            tip_hash: "unanchored".to_string(),
            event_count: 0,
        }
    }
}

impl EvidenceAttachmentKernel for StubEvidenceKernel {
    fn attach_result_evidence(&self, _attachment: ResultEvidenceAttachment) -> Result<(), &'static str> { Ok(()) }
}

impl EvidenceAlertKernel for StubEvidenceKernel {
    fn report_event_gap(&self, _alert: EvidenceGapAlert) -> Result<(), &'static str> { Ok(()) }
    fn report_lineage_inconsistency(&self, _alert: LineageInconsistencyAlert) -> Result<(), &'static str> { Ok(()) }
}
