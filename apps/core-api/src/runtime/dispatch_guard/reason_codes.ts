export const DENY: Record<string, string> = {
  CAT_INACTIVE: "CAT is inactive",
  CAT_QUARANTINED: "CAT is quarantined",
  CAT_ROGUE: "CAT is rogue",
  ORG_NOT_ALLOWED: "Organization not allowed",
  USER_NOT_ALLOWED: "User not allowed",
  PROVIDER_NOT_ALLOWED: "Provider not allowed for this CAT/org policy",
  BUDGET_EXCEEDED: "Budget exceeded",
  RATE_LIMITED: "Rate limited",
  TOOL_NOT_ALLOWED: "Tool intent not allowed",
  ROUTE_NOT_ALLOWED: "Route not allowed",
  SCHEMA_EXPOSURE_BLOCKED: "Schema exposure blocked",
  REPLAY_DETECTED: "Replay detected",
  POLICY_SNAPSHOT_INVALID: "Policy snapshot invalid"
};

export const CHALLENGE: Record<string, string> = {
  MFA_REQUIRED: "MFA required",
  OTP_REQUIRED: "OTP required",
  CAPTCHA_REQUIRED: "Captcha required"
};
