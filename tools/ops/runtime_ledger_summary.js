"use strict";

const fs = require("fs");
const path = require("path");

const ledgers = [
  { name: "DISPATCH_GUARD", path: "docs/ops/ledgers/runtime/DISPATCH_GUARD.jsonl" },
  { name: "POLICY_GATE", path: "docs/ops/ledgers/runtime/POLICY_GATE.jsonl" },
  { name: "EXECUTION_GUARD", path: "docs/ops/ledgers/runtime/EXECUTION_GUARD.jsonl" },
  { name: "RESULT_SANITIZER", path: "docs/ops/ledgers/runtime/RESULT_SANITIZER.jsonl" }
];

function safeReadLines(rel) {
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) return [];
  const txt = fs.readFileSync(full, "utf8").trim();
  if (!txt) return [];
  return txt.split("\n").filter(Boolean);
}

function safeParse(line) {
  try { return JSON.parse(line); } catch { return null; }
}

function bump(map, key) {
  const k = String(key ?? "null");
  map.set(k, (map.get(k) || 0) + 1);
}

function topN(map, n = 5) {
  return [...map.entries()].sort((a,b) => b[1] - a[1]).slice(0, n);
}

function fmtTop(entries) {
  return entries.map(([k,v]) => `${k}: ${v}`).join(", ");
}

function run() {
  const summary = [];

  for (const L of ledgers) {
    const lines = safeReadLines(L.path);
    const rows = lines.map(safeParse).filter(Boolean);

    const byVerdict = new Map();
    const byReason = new Map();
    const byProvider = new Map();

    for (const r of rows) {
      // normalize fields across ledgers
      const verdict = r.verdict ?? r.action ?? "UNKNOWN";
      const reason = (r.deny_reason_code ?? r.reason_code ?? r.rule_id ?? (Array.isArray(r.redactions) ? r.redactions[0] : null) ?? "none");
      const provider = r.provider_requested ?? r.provider ?? "unknown";

      bump(byVerdict, verdict);
      bump(byReason, reason);
      bump(byProvider, provider);
    }

    summary.push({
      ledger: L.name,
      rows: rows.length,
      verdicts_top: fmtTop(topN(byVerdict, 10)),
      reasons_top: fmtTop(topN(byReason, 10)),
      providers_top: fmtTop(topN(byProvider, 10))
    });
  }

  console.log("\n== RGPT Runtime Ledger Summary ==");
  for (const s of summary) {
    console.log(`\n[${s.ledger}] rows=${s.rows}`);
    console.log(`  verdicts : ${s.verdicts_top}`);
    console.log(`  reasons  : ${s.reasons_top}`);
    console.log(`  providers: ${s.providers_top}`);
  }
}

run();

