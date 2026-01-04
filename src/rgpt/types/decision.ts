export type DecisionType = "ci" | "runtime" | "manual";
export type DecisionSource = "orchestrator" | "builder" | "self_heal" | "self_improve";
export type DecisionStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

export interface DecisionRecord {
  decision_id: string;
  decision_type: DecisionType;
  source: DecisionSource;
  status: DecisionStatus;
  policy_snapshot: string; // sha256 hash
  approved_by: string | null;
  created_utc: string;     // ISO-8601 UTC
  approved_utc: string | null;
  expires_utc: string | null;
  checksum: string;        // sha256(decision_record)
}

export interface DecisionVerifyResult {
  ok: boolean;
  reason?: string;
  decision?: DecisionRecord;
}
