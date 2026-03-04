import crypto from "node:crypto";
import { appendJsonl, decisionLedgerPath, executionLedgerPath, ensureSelfImproveDirs, nowIso } from "./paths.mjs";

function makeLedgerId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function writeDecisionLedger(entry) {
  await ensureSelfImproveDirs();
  const payload = {
    ledger_id: makeLedgerId("dec"),
    timestamp: nowIso(),
    ...entry,
  };
  await appendJsonl(decisionLedgerPath, payload);
  return payload;
}

export async function writeExecutionLedger(entry) {
  await ensureSelfImproveDirs();
  const payload = {
    ledger_id: makeLedgerId("exe"),
    timestamp: nowIso(),
    ...entry,
  };
  await appendJsonl(executionLedgerPath, payload);
  return payload;
}
