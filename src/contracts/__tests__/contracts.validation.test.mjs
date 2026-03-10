import test from "node:test";
import assert from "node:assert/strict";
import {
  validateAnalysisReport,
  validateEvidencePack,
  validateIQScorecard,
  validateWorkflowPlan,
} from "../runtime.mjs";

const now = "2026-03-05T12:00:00Z";
const sha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const artifactRef = {
  id: "art-1",
  uri: "s3://rgpt/artifacts/art-1.json",
  media_type: "application/json",
  bytes: 421,
  checksum_sha256: sha,
};

const workflowPlan = {
  version: "1.0",
  plan_id: "plan-001",
  session_id: "sess-001",
  objective: "Generate a constrained execution plan",
  created_at: now,
  steps: [
    {
      id: "step-1",
      title: "Collect context",
      estimated_ms: 120,
      max_db_queries: 2,
      artifact_refs: [artifactRef],
    },
  ],
};

const iqScorecard = {
  version: "1.0",
  scorecard_id: "score-001",
  session_id: "sess-001",
  overall_score: 87,
  generated_at: now,
  dimensions: [
    { key: "correctness", score: 90, rationale: "Output aligns with evidence refs" },
    { key: "latency", score: 84 },
  ],
  evidence_refs: [artifactRef],
};

const evidencePack = {
  version: "1.0",
  pack_id: "pack-001",
  session_id: "sess-001",
  generated_at: now,
  summary: "Compact evidence index",
  evidence_refs: [artifactRef],
};

const analysisReport = {
  version: "1.0",
  report_id: "report-001",
  session_id: "sess-001",
  status: "ok",
  generated_at: now,
  workflow_plan_ref: { id: "plan-001", uri: "rgpt://plans/plan-001" },
  scorecard_ref: { id: "score-001", uri: "rgpt://scorecards/score-001" },
  evidence_pack_ref: { id: "pack-001", uri: "rgpt://evidence/pack-001" },
  findings: [
    {
      code: "F-001",
      severity: "low",
      message: "No policy drift observed",
      evidence_ref: artifactRef,
    },
  ],
};

test("validateWorkflowPlan accepts valid payload", () => {
  const result = validateWorkflowPlan(workflowPlan);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateIQScorecard accepts valid payload", () => {
  const result = validateIQScorecard(iqScorecard);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateEvidencePack accepts valid payload", () => {
  const result = validateEvidencePack(evidencePack);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateAnalysisReport accepts valid payload", () => {
  const result = validateAnalysisReport(analysisReport);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validation rejects large inline artifact object", () => {
  const bad = {
    ...analysisReport,
    workflow_plan_ref: {
      ...analysisReport.workflow_plan_ref,
      content: { giant: "not-allowed-inline-artifact" },
    },
  };
  const result = validateAnalysisReport(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("not allowed")));
});

test("validation rejects missing required fields", () => {
  const bad = { ...workflowPlan };
  delete bad.plan_id;
  const result = validateWorkflowPlan(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("plan_id is required")));
});
