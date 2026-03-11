use crate::domain::types::{
    AppendOnlyEvent, ChainMode, EvidenceGapAlert, EvidenceReceipt, HashChainCheckpoint,
    LineageInconsistencyAlert, ResultEvidenceAttachment,
};

pub trait EvidenceKernel {
    fn chain_mode(&self) -> ChainMode;
    fn append_event(&self, event: AppendOnlyEvent) -> Result<(), &'static str>;
    fn issue_receipt(&self, receipt: EvidenceReceipt) -> Result<(), &'static str>;
    fn latest_checkpoint(&self) -> HashChainCheckpoint;
}

pub trait EvidenceAttachmentKernel {
    fn attach_result_evidence(
        &self,
        attachment: ResultEvidenceAttachment,
    ) -> Result<(), &'static str>;
}

pub trait EvidenceAlertKernel {
    fn report_event_gap(&self, alert: EvidenceGapAlert) -> Result<(), &'static str>;
    fn report_lineage_inconsistency(
        &self,
        alert: LineageInconsistencyAlert,
    ) -> Result<(), &'static str>;
}
