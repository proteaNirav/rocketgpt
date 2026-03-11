#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AwarenessConfig {
    pub service_name: &'static str,
    pub family_scope: &'static str,
}

impl Default for AwarenessConfig {
    fn default() -> Self {
        Self {
            service_name: "mak-awareness",
            family_scope: "first-life-mesh",
        }
    }
}
