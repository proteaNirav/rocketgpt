import fs from "node:fs";
import path from "node:path";

function repoRootFromCwd() {
  let cursor = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(cursor, "rocketgpt_v3_full")) || fs.existsSync(path.join(cursor, "cats"))) {
      return cursor;
    }
    const next = path.resolve(cursor, "..");
    if (next === cursor) break;
    cursor = next;
  }
  return process.cwd();
}

function ledgerPath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "workflow-ledger.jsonl");
}

export function appendWorkflowLedgerEvent(eventType, payload) {
  const fp = ledgerPath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const row = {
    ts: new Date().toISOString(),
    eventType: String(eventType || "workflow.event"),
    payload: payload && typeof payload === "object" ? payload : {},
  };
  fs.appendFileSync(fp, `${JSON.stringify(row)}\n`, "utf8");
  return row;
}

export function listWorkflowLedgerEvents() {
  try {
    const raw = fs.readFileSync(ledgerPath(), "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

export function clearWorkflowLedgerForTests() {
  try {
    fs.unlinkSync(ledgerPath());
  } catch {
    // ignore
  }
}

