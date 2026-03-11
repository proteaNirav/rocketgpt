#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RouterConfig {
    pub service_name: &'static str,
    pub zero_trust_required: bool,
    pub quarantine_guard_enabled: bool,
}

impl Default for RouterConfig {
    fn default() -> Self {
        Self {
            service_name: "mak-router",
            zero_trust_required: true,
            quarantine_guard_enabled: true,
        }
    }
}
