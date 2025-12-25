export type DeviceMode = "cloud" | "edge" | "offline-degraded";

export type AgentName = "planner" | "builder" | "tester" | "approvals" | "system";

export type DecisionType =
  | "plan"
  | "code_change"
  | "test_run"
  | "block"
  | "allow"
  | "info";

export type Decision = "allow" | "deny" | "defer";

export type OutcomeStatus =
  | "success"
  | "partial"
  | "blocked_policy"
  | "blocked_token"
  | "failed_runtime"
  | "stopped_by_user"
  | "export_failed";

export interface DecisionEntry {
  decision_id: string;            // uuid (string)
  run_id: string;                 // uuid (string)
  session_id?: string;            // uuid (string) - optional
  step?: string;                  // e.g., "planner:1" | "builder:2"

  cat_id: string;                 // "core" for now, later a real CAT id
  cat_version: string;            // "0.0.0" or semver
  device_mode: DeviceMode;        // cloud | edge | offline-degraded

  agent: AgentName;
  decision_type: DecisionType;
  intent: string;

  inputs_summary?: string;        // sanitized summary only
  evidence?: Record<string, unknown>;
  constraints?: Record<string, unknown>;

  risk_score: number;             // 0..1
  confidence_score: number;       // 0..1

  decision: Decision;             // allow | deny | defer
  reasoning: string;

  context_hash?: string;          // SHA-256 of Execution Context v2 (or "pending" early)
  supersedes?: string | null;     // decision_id being superseded (append-only)

  timestamp: string;              // ISO UTC string
}

export interface DecisionOutcome {
  decision_id: string;            // FK to DecisionEntry
  run_id: string;

  status: OutcomeStatus;
  error_type?: "none" | "policy" | "runtime" | "regression";

  metrics?: {
    duration_ms?: number;
    tokens_in?: number;
    tokens_out?: number;
    retries?: number;
  };

  side_effects?: {
    files_changed?: string[];
    tests_run?: string[];
    notes?: string;
  };

  human_intervention?: boolean;

  evaluated_at: string;           // ISO UTC string
}
