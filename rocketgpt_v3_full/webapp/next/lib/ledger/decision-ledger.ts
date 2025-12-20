import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Decision Ledger (D1)
 * -------------------
 * Append-only JSONL ledger written per-run under:
 *   <nextRoot>/rocketgpt_runs/<runId>/logs/ledger.jsonl
 *
 * Rationale:
 * - Avoids `.next/` build output paths
 * - Aligns with existing RocketGPT run log structure
 * - Keeps audit artifacts grouped by runId
 */
const NEXT_ROOT = process.cwd();

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getLedgerFileForRun(runId: string) {
  const logsDir = path.join(NEXT_ROOT, "rocketgpt_runs", runId, "logs");
  ensureDir(logsDir);
  return path.join(logsDir, "ledger.jsonl");
}

export function writeDecision(entry: Record<string, unknown>) {
  const runId = String((entry as any)?.runId ?? "").trim();
  if (!runId) {
    throw new Error("writeDecision requires entry.runId (non-empty)");
  }

  const fullEntry = {
    ledgerId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    immutable: true,
    ...entry,
  };

  const ledgerFile = getLedgerFileForRun(runId);
  fs.appendFileSync(ledgerFile, JSON.stringify(fullEntry) + "\n", "utf8");
  return fullEntry.ledgerId as string;
}

export function hashInputs(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
