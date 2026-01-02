import { DecisionRecord, DecisionVerifyResult } from "../types/decision";

/**
 * Decision Ledger storage model (Phase S4):
 * - File-based JSONL ledger: one decision per line (append-only)
 * - Location: docs/ops/ledger/DECISIONS.jsonl
 *
 * NOTE: This is the "read/verify" client. Writing/append comes in later steps.
 */
const DEFAULT_LEDGER_PATH = "docs/ops/ledger/DECISIONS.jsonl";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseIsoUtc(s: string): number | null {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function nowUtcMs(): number {
  return Date.now();
}

export async function loadDecisionById(
  decision_id: string,
  ledgerPath: string = DEFAULT_LEDGER_PATH
): Promise<DecisionRecord | null> {
  if (!isNonEmptyString(decision_id)) return null;

  // Dynamic import to keep node-only dependency out of edge bundles.
  const fs = await import("node:fs/promises");

  let data: string;
  try {
    data = await fs.readFile(ledgerPath, "utf8");
  } catch {
    return null;
  }

  const lines = data.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    try {
      const obj = JSON.parse(line) as DecisionRecord;
      if (obj && obj.decision_id === decision_id) return obj;
    } catch {
      // ignore bad lines
    }
  }
  return null;
}

/**
 * Verify decision record against required governance gates.
 * - status must be APPROVED
 * - policy_snapshot must match expected_policy_hash
 * - must not be expired (if expires_utc is set)
 * - must not be REVOKED
 */
export function verifyDecision(
  decision: DecisionRecord | null,
  expected_policy_hash: string
): DecisionVerifyResult {
  if (!decision) return { ok: false, reason: "DECISION_NOT_FOUND" };

  // Basic required fields
  if (!isNonEmptyString(decision.decision_id)) return { ok: false, reason: "MISSING_DECISION_ID" };
  if (!isNonEmptyString(decision.policy_snapshot)) return { ok: false, reason: "MISSING_POLICY_HASH" };
  if (!isNonEmptyString(expected_policy_hash)) return { ok: false, reason: "MISSING_EXPECTED_POLICY_HASH" };

  // Status gates
  if (decision.status === "REVOKED") return { ok: false, reason: "DECISION_REVOKED" };
  if (decision.status !== "APPROVED") return { ok: false, reason: "DECISION_NOT_APPROVED" };

  // Policy hash match
  if (decision.policy_snapshot !== expected_policy_hash) return { ok: false, reason: "POLICY_HASH_MISMATCH" };

  // Expiry gate (optional)
  if (decision.expires_utc) {
    const exp = parseIsoUtc(decision.expires_utc);
    if (!exp) return { ok: false, reason: "INVALID_EXPIRES_UTC" };
    if (nowUtcMs() > exp) return { ok: false, reason: "DECISION_EXPIRED" };
  }

  return { ok: true, decision };
}
