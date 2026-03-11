use crate::domain::types::{AuthorityGrant, AuthorityMode, EmergencyOverride, RevocationRecord};

pub trait AuthorityKernel {
    fn current_mode(&self) -> AuthorityMode;
    fn issue_grant(&self, grant: AuthorityGrant) -> Result<(), &'static str>;
    fn revoke_grant(&self, record: RevocationRecord) -> Result<(), &'static str>;
    fn activate_override(&self, command: EmergencyOverride) -> Result<(), &'static str>;
}
