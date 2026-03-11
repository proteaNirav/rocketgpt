#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthorityConfig {
    pub service_name: &'static str,
    pub default_mode: &'static str,
    pub key_store_hint: &'static str,
}

impl Default for AuthorityConfig {
    fn default() -> Self {
        Self {
            service_name: "mak-authority",
            default_mode: "bounded",
            key_store_hint: "owner-held-root-authority",
        }
    }
}
