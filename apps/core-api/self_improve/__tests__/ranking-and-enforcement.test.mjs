import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { rankFindings } from "../ranking.mjs";
import { enforceProposalConstraints, applyTypeImportFixForTest } from "../executor.mjs";
import { writeDecisionLedger, writeExecutionLedger } from "../ledger.mjs";
import { decisionLedgerPath, executionLedgerPath, repoRoot } from "../paths.mjs";

test("rankFindings orders by severity", () => {
  const findings = [
    { id: "3", severity: "info" },
    { id: "1", severity: "critical" },
    { id: "2", severity: "warn" },
  ];
  const ranked = rankFindings(findings);
  assert.deepEqual(
    ranked.map((x) => x.id),
    ["1", "2", "3"]
  );
});

test("enforceProposalConstraints blocks out-of-scope files", async () => {
  const proposal = {
    plan: {
      scope: {
        allowed_paths: ["rocketgpt_v3_full/webapp/next/**"],
        disallowed_paths: ["**/.env*"],
        max_files_changed: 2,
      },
    },
  };
  const result = await enforceProposalConstraints(proposal, ["docs/self_improve/README.md"]);
  assert.equal(result.ok, false);
});

test("enforceProposalConstraints blocks max_files_changed overflow", async () => {
  const proposal = {
    plan: {
      scope: {
        allowed_paths: ["rocketgpt_v3_full/webapp/next/**"],
        disallowed_paths: [],
        max_files_changed: 1,
      },
    },
  };
  const result = await enforceProposalConstraints(proposal, [
    "rocketgpt_v3_full/webapp/next/app/a.ts",
    "rocketgpt_v3_full/webapp/next/app/b.ts",
  ]);
  assert.equal(result.ok, false);
  assert.match(result.reason, /max_files_changed/);
});

test("deterministic auto-fix inserts missing type import", async () => {
  const tempPath = path.join(repoRoot, "docs", "self_improve", "tmp.type-import.test.ts");
  await fs.mkdir(path.dirname(tempPath), { recursive: true });
  await fs.writeFile(tempPath, "export function x(a: ReactNode) { return a; }\n", "utf8");
  const relPath = path.relative(repoRoot, tempPath).replace(/\\/g, "/");
  const result = await applyTypeImportFixForTest({
    path: relPath,
    rationale: "deterministic:type-import:ReactNode:react",
  });
  assert.equal(result.applied, true);
  const next = await fs.readFile(tempPath, "utf8");
  assert.match(next, /import type \{ ReactNode \} from "react";/);
  await fs.rm(tempPath, { force: true });
});

test("ledger record creation appends decision + execution entries", async () => {
  await writeDecisionLedger({
    actor: "test",
    action: "unit_test_decision",
    proposal_id: "SI-TEST-LEDGER",
    evidence_refs: [],
  });
  await writeExecutionLedger({
    actor: "test",
    action: "unit_test_execution",
    proposal_id: "SI-TEST-LEDGER",
    evidence_refs: [],
  });
  const d = await fs.readFile(decisionLedgerPath, "utf8");
  const e = await fs.readFile(executionLedgerPath, "utf8");
  assert.match(d, /unit_test_decision/);
  assert.match(e, /unit_test_execution/);
});
