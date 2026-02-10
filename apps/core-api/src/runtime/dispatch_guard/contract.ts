export type DispatchVerdict = "ALLOW" | "DENY" | "CHALLENGE";

export type DispatchDenyReasonCode =
  | "CAT_INACTIVE"
  | "CAT_QUARANTINED"
  | "CAT_ROGUE"
  | "ORG_NOT_ALLOWED"
  | "USER_NOT_ALLOWED"
  | "PROVIDER_NOT_ALLOWED"
  | "BUDGET_EXCEEDED"
  | "RATE_LIMITED"
  | "TOOL_NOT_ALLOWED"
  | "ROUTE_NOT_ALLOWED"
  | "SCHEMA_EXPOSURE_BLOCKED"
  | "REPLAY_DETECTED"
  | "POLICY_SNAPSHOT_INVALID";

export type DispatchChallengeReasonCode =
  | "MFA_REQUIRED"
  | "OTP_REQUIRED"
  | "CAPTCHA_REQUIRED";

export type DispatchReasonCode = DispatchDenyReasonCode | DispatchChallengeReasonCode;

export type DispatchGuardInput = {
  ts: string; // ISO-8601 with timezone
  request_id: string;
  org_id: string;
  user_id: string;
  workflow_id?: string | null;

  cat_id: string;
  cat_version?: string | null;
  cat_status: "active" | "inactive" | "quarantined" | "rogue";

  provider_requested: string;
  cat_allowed_providers: string[];

  // Simple budget controls (Phase-D v1)
  token_estimate?: number | null;
  max_tokens?: number | null;

  // Optional: simple replay protection
  nonce?: string | null;

  // Optional: route/tool enforcement hooks
  route?: string | null;
  tool_intents?: string[] | null;

  // Policy snapshot identity
  policy_version?: string | null;
  policy_hash?: string | null;
};

export type DispatchGuardResult = {
  verdict: DispatchVerdict;
  http_status: number;
  reason_code?: DispatchReasonCode | null;
  message: string;
  actions: string[];
  ledger_written: boolean;
};
