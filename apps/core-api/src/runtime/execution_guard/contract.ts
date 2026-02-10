export type ExecutionGuardAction = "CONTINUE" | "WARN" | "ABORT" | "DEGRADE" | "REROUTE";

export type ExecutionGuardSignal = {
  ts: string;
  execution_id: string;
  request_id: string;
  org_id: string;
  user_id: string;
  cat_id: string;
  provider: string;

  // Signals (v1)
  token_estimate?: number | null;
  tokens_used?: number | null;
  latency_ms?: number | null;
  attempt?: number | null;

  tool_intents?: string[] | null;
  tool_intents_observed?: string[] | null;
};

export type ExecutionGuardResult = {
  action: ExecutionGuardAction;
  reason: string;
  ledger_written: boolean;
};
