export interface ErrorEnvelope {
  code: string;
  message: string;
  origin: string;
  actionable_hint: string;
}

export function wrapError(e: any, origin: string): ErrorEnvelope {
  return {
    code: e?.code ?? "UNKNOWN",
    message: e?.message ?? "Unexpected error",
    origin,
    actionable_hint: "Check logs or re-run with diagnostics enabled."
  };
}
