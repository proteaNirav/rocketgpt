export type SanitizerVerdict = "PASS" | "SANITIZED" | "BLOCK";

export type ResultSanitizerInput = {
  ts: string;
  request_id: string;
  org_id: string;
  user_id: string;
  cat_id: string;
  provider: string;

  // raw provider output (string)
  output_text: string;

  // optional schema requirement
  schema_required?: boolean | null;

  // safe-mode / compliance flags
  safe_mode?: boolean | null;
  pii_mode?: "off" | "redact" | "block" | null;
};

export type ResultSanitizerResult = {
  verdict: SanitizerVerdict;
  message: string;
  output_text: string; // possibly modified
  redactions: string[];
  ledger_written: boolean;
};
