#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvidenceConfig {
    pub service_name: &'static str,
    pub anchor_policy: &'static str,
}

impl Default for EvidenceConfig {
    fn default() -> Self {
        Self {
            service_name: "mak-evidence",
            anchor_policy: "append-only",
        }
    }
}
