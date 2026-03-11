#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SurvivalConfig {
    pub service_name: &'static str,
    pub default_state: &'static str,
}

impl Default for SurvivalConfig {
    fn default() -> Self {
        Self {
            service_name: "mak-survival",
            default_state: "normal",
        }
    }
}
