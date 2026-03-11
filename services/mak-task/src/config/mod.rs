#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskConfig {
    pub service_name: &'static str,
    pub governance_required: bool,
    pub evidence_required: bool,
}

impl Default for TaskConfig {
    fn default() -> Self {
        Self {
            service_name: "mak-task",
            governance_required: true,
            evidence_required: true,
        }
    }
}
