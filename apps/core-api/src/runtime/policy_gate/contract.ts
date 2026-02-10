export type PolicyGateVerdict = "ALLOW" | "DENY" | "DEGRADE" | "REROUTE";

export type PolicyGateInput = {
  ts: string;
  request_id: string;
  org_id: string;
  user_id: string;

  cat_id: string;
  provider_requested: string;

  token_estimate?: number | null;
  tool_intents?: string[] | null;
};

export type PolicyGateResult = {
  verdict: PolicyGateVerdict;
  http_status: number;
  rule_id?: string | null;
  message: string;
  actions: string[];
  policy_version?: string | null;
  ledger_written: boolean;
};
