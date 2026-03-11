use crate::config::AuthorityConfig;
use crate::domain::types::{AuthorityGrant, AuthorityMode, EmergencyOverride, RevocationRecord};
use crate::services::interfaces::AuthorityKernel;

#[derive(Debug, Clone)]
pub struct StubAuthorityKernel {
    config: AuthorityConfig,
}

impl StubAuthorityKernel {
    pub fn new(config: AuthorityConfig) -> Self {
        Self { config }
    }
}

impl AuthorityKernel for StubAuthorityKernel {
    fn current_mode(&self) -> AuthorityMode {
        match self.config.default_mode {
            "emergency_override" => AuthorityMode::EmergencyOverride,
            "restricted" => AuthorityMode::Restricted,
            _ => AuthorityMode::Bounded,
        }
    }

    fn issue_grant(&self, _grant: AuthorityGrant) -> Result<(), &'static str> {
        Ok(())
    }

    fn revoke_grant(&self, _record: RevocationRecord) -> Result<(), &'static str> {
        Ok(())
    }

    fn activate_override(&self, _command: EmergencyOverride) -> Result<(), &'static str> {
        Ok(())
    }
}
