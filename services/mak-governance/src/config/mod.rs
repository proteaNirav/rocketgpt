#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GovernanceConfig {
    pub service_name: &'static str,
    pub constitution_version: &'static str,
    pub default_mode: &'static str,
}

impl Default for GovernanceConfig {
    fn default() -> Self {
        Self {
            service_name: "mak-governance",
            constitution_version: "MISHTI_CONSTITUTION_V1",
            default_mode: "normal",
        }
    }
}
