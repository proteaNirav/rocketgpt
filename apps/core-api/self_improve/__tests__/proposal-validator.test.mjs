import test from "node:test";
import assert from "node:assert/strict";
import { validateProposal } from "../proposal-validator.mjs";

const validProposal = {
  proposal_id: "SI-TEST-0001",
  finding: {
    type: "ci_failure",
    severity: "error",
    summary: "Lint failed",
    evidence_refs: ["docs/self_improve/evidence/x/log.txt"],
  },
  plan: {
    scope: {
      allowed_paths: ["rocketgpt_v3_full/webapp/next/**"],
      disallowed_paths: ["**/.env*"],
      max_files_changed: 15,
    },
    changes: [{ kind: "code", path: "rocketgpt_v3_full/webapp/next/app/x.ts", rationale: "deterministic:prettier:rocketgpt_v3_full/webapp/next" }],
    risk: "medium",
    rollback: "git restore --source=HEAD~1 -- .",
  },
  verification: {
    required_checks: ["policy_gate", "safe_mode", "tests", "replay"],
    commands: ["echo verify"],
  },
  approvals: {
    requires_human: true,
    auto_merge_allowed: false,
  },
};

test("validateProposal accepts valid contract", async () => {
  const result = await validateProposal(validProposal);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateProposal rejects unknown fields", async () => {
  const bad = { ...validProposal, extra: true };
  const result = await validateProposal(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("not allowed")));
});

test("validateProposal rejects invalid enum", async () => {
  const bad = { ...validProposal, finding: { ...validProposal.finding, severity: "fatal" } };
  const result = await validateProposal(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("severity")));
});
