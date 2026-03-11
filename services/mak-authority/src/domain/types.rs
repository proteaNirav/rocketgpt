#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthorityMode {
    Bounded,
    Restricted,
    EmergencyOverride,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GrantState {
    Pending,
    Active,
    Revoked,
    Expired,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TrustLevel {
    Zero,
    Provisional,
    Trusted,
    RootDelegated,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RevocationReason {
    PolicyViolation,
    ExpiredScope,
    CompromiseSuspected,
    OwnerOverride,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthorityGrant {
    pub grant_id: String,
    pub actor_id: String,
    pub scope: String,
    pub trust_level: TrustLevel,
    pub state: GrantState,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RevocationRecord {
    pub grant_id: String,
    pub actor_id: String,
    pub reason: RevocationReason,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmergencyOverride {
    pub override_id: String,
    pub initiated_by: String,
    pub justification: String,
    pub active: bool,
}
