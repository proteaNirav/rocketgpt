#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChainMode {
    AppendOnly,
    Quarantined,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReceiptState {
    Accepted,
    Rejected,
    Quarantined,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ValidationState {
    Pending,
    Required,
    Satisfied,
    Rejected,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppendOnlyEvent {
    pub event_id: String,
    pub actor_id: String,
    pub payload_hash: String,
    pub previous_hash: Option<String>,
    pub event_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceReceipt {
    pub receipt_id: String,
    pub packet_id: String,
    pub state: ReceiptState,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HashChainCheckpoint {
    pub checkpoint_id: String,
    pub tip_hash: String,
    pub event_count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceMetadataPlaceholder {
    pub event_type: String,
    pub payload_hash: Option<String>,
    pub evidence_ref: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LineagePlaceholder {
    pub source_task_id: Option<String>,
    pub source_trace_id: Option<String>,
    pub upstream_ref: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidationPlaceholder {
    pub validation_state: ValidationState,
    pub validator_refs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResultEvidenceAttachment {
    pub attachment_id: String,
    pub task_id: String,
    pub actor_id: String,
    pub result_summary: String,
    pub evidence: Vec<EvidenceMetadataPlaceholder>,
    pub lineage: LineagePlaceholder,
    pub validation: ValidationPlaceholder,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceGapAlert {
    pub alert_id: String,
    pub affected_actor_id: String,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LineageInconsistencyAlert {
    pub alert_id: String,
    pub affected_entity_id: String,
    pub summary: String,
}
