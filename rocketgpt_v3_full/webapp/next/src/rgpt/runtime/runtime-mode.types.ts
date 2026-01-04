export type RuntimeMode =
  | "OFFLINE"
  | "SAFE"
  | "SUPERVISED"
  | "AUTONOMOUS"
  | "SELF_EVOLUTION"; // LOCKED, do not enable in S3

export type DowngradeTrigger =
  | "policyViolation"
  | "unexpectedDrift"
  | "ciInstability";

export type RuntimeModeConfig = {
  defaultMode: Exclude<RuntimeMode, "SELF_EVOLUTION">; // default must never be SELF_EVOLUTION in S3
  allowedTransitions: Record<RuntimeMode, RuntimeMode[]>;
  downgradeTriggers: Record<string, Exclude<RuntimeMode, "SELF_EVOLUTION">>;
  requireExplicitConfirmFor: RuntimeMode[];
  notes?: Record<string, string>;
};

export type ResolveInput = {
  requestedMode?: RuntimeMode;
  currentMode?: RuntimeMode;               // last known mode (e.g., from DB/ledger)
  envMode?: RuntimeMode;                   // e.g., from ENV
  hasExplicitConfirmation?: boolean;       // approval/confirm flag (e.g., from UI / token)
  triggers?: DowngradeTrigger[];           // runtime safety triggers
};

export type ResolveResult = {
  mode: Exclude<RuntimeMode, "SELF_EVOLUTION">;
  reason: string;
  warnings: string[];
  blockedTransitions: string[];
};
