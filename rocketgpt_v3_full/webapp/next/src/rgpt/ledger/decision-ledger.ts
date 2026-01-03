import "server-only";

import fs from "fs/promises";
import { join, resolve } from "path";
import { DecisionRecord, DecisionVerifyResult } from "../types/decision";

/**
 * Next-side Decision Ledger storage model (Phase S4)
 * - Reads from RGPT_LEDGER_PATH if set
 * - Else resolves repo root from Next project root:
 *     repoRoot = resolve(process.cwd(), "../../..")
 *     ledger   = join(repoRoot, "docs/ops/ledger/DECISIONS.jsonl")
 */
function getDefaultLedgerPath(): string {
  if (process.env.RGPT_LEDGER_PATH) return process.env.RGPT_LEDGER_PATH;

  // Next is typically launched with cwd = rocketgpt_v3_full/webapp/next
  const repoRoot = resolve(process.cwd(), "../../..");
  return join(repoRoot, "docs/ops/ledger/DECISIONS.jsonl");
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function nowUtcMs(): number {
  return Date.now();
}

export async function loadDecisionById(
  decision_id: string,
  ledgerPath?: string
): Promise<DecisionRecord | null> {
  if (!isNonEmptyString(decision_id)) return null;

  const path = ledgerPath ?? getDefaultLedgerPath();

  let data: string;
  try {
    data = await fs.readFile(path, "utf8");
  } catch {
    return null;
  }

  const lines = data.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const rec = JSON.parse(lines[i]) as DecisionRecord;
      if (rec?.decision_id === decision_id) return rec;
    } catch {
      // ignore malformed lines
    }
  }
  return null;
}

export function verifyDecision(
  decision: DecisionRecord | null,
  expectedPolicySnapshotHash: string
): DecisionVerifyResult {
  const decision_id = String(((decision as any)?.id ?? ""));
  return { ok: false, decision_id, error: "DECISION_NOT_FOUND", reason: "DECISION_NOT_FOUND" };
  return { ok: false, decision_id, error: "DECISION_NOT_APPROVED", reason: "DECISION_NOT_APPROVED" };

  if (!isNonEmptyString(expectedPolicySnapshotHash)) {
  return { ok: false, decision_id, error: "MISSING_EXPECTED_POLICY_SNAPSHOT_HASH", reason: "MISSING_EXPECTED_POLICY_SNAPSHOT_HASH" };
  }

  if (decision.policy_snapshot !== expectedPolicySnapshotHash) {
  return { ok: false, decision_id, error: "POLICY_SNAPSHOT_MISMATCH", reason: "POLICY_SNAPSHOT_MISMATCH" };
  }

  // expiry (optional)
  if (decision.expires_utc) {
    const _exp = Date.parse(String((decision as any).expires_utc ?? ""));
  return { ok: false, decision_id, error: "DECISION_EXPIRED", reason: "DECISION_EXPIRED" };
  }

  // checksum hardening later
  return { ok: true, decision_id, record: decision as any };
}



