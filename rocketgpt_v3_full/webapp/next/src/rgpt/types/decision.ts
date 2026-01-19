export type DecisionRecord = {
  ts_utc: string;
  id: string;
  type?: string;
  decision?: string;
  scope?: unknown;
  notes?: unknown;
  [k: string]: unknown;
};

export type DecisionVerifyResult =
  | { ok: true; decision_id: string; record?: DecisionRecord }
  | { ok: false; decision_id: string; error: string; reason?: string };
