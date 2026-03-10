import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { getEvidencePackByPlanId } from "./research-layer.mjs";
import { listNodeRuns } from "./workflow-store.mjs";

const SHORT_TIMEBOX_MS = 700;
const EXTENDED_TIMEBOX_MS = 1800;

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

function storePath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "analysis-reports.json");
}

function nowIso() {
  return new Date().toISOString();
}

function sha(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    return {
      reportsById: parsed?.reportsById && typeof parsed.reportsById === "object" ? parsed.reportsById : {},
      planToReportId: parsed?.planToReportId && typeof parsed.planToReportId === "object" ? parsed.planToReportId : {},
    };
  } catch {
    return { reportsById: {}, planToReportId: {} };
  }
}

function writeStore(store) {
  const fp = storePath();
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify(store, null, 2), "utf8");
}

function loadNodeOutputRefs(workflowRunId) {
  if (!workflowRunId) return [];
  const rows = listNodeRuns(workflowRunId);
  return rows
    .filter((row) => row && typeof row.outputRef === "string" && row.outputRef.length > 0)
    .map((row) => ({
      nodeId: row.nodeId,
      catId: row.catId,
      outputRef: row.outputRef,
      status: row.status,
    }));
}

function boundedOptions(extended, startedAt, timeboxMs) {
  const seed = [
    {
      title: "Conservative rollout",
      pros: ["Lower operational risk", "Easier governance verification"],
      cons: ["Slower delivery", "May miss short-term opportunity"],
    },
    {
      title: "Balanced rollout",
      pros: ["Reasonable speed-to-value", "Can preserve auditability"],
      cons: ["Needs tighter coordination", "Moderate execution risk"],
    },
    {
      title: "Aggressive rollout",
      pros: ["Fastest potential impact", "Quick user-visible gains"],
      cons: ["Higher failure probability", "Greater rollback overhead"],
    },
  ];
  const max = extended ? 3 : 2;
  const out = [];
  for (let i = 0; i < max; i += 1) {
    if (Date.now() - startedAt >= timeboxMs) break;
    out.push(seed[i]);
  }
  return out;
}

export function getAnalysisReportByPlanId(planId) {
  const store = readStore();
  const reportId = store.planToReportId[String(planId || "")];
  if (!reportId) return null;
  return store.reportsById[reportId] || null;
}

export function getAnalysisReportById(reportId) {
  const store = readStore();
  return store.reportsById[String(reportId || "")] || null;
}

export function clearAnalysisStoreForTests() {
  try {
    fs.unlinkSync(storePath());
  } catch {
    // ignore
  }
}

export function buildAnalysisReport(input) {
  const started = Date.now();
  const planId = String(input?.planId || "").trim();
  const workflowRunId = input?.workflowRunId ? String(input.workflowRunId) : null;
  const mode = String(input?.reportMode || "short").toLowerCase() === "extended" ? "extended" : "short";
  const timeboxMs = Math.max(200, Number(input?.timeboxMs || (mode === "extended" ? EXTENDED_TIMEBOX_MS : SHORT_TIMEBOX_MS)));
  const evidencePack = getEvidencePackByPlanId(planId);
  if (!evidencePack) {
    throw new Error(`EvidencePack missing for planId: ${planId}`);
  }

  const nodeRefs = loadNodeOutputRefs(workflowRunId);
  const options = boundedOptions(mode === "extended", started, timeboxMs);
  const partial = Date.now() - started >= timeboxMs || options.length === 0;
  const confidenceScore = Math.max(0.35, Math.min(0.95, Number((0.5 + Math.min(0.35, (nodeRefs.length + 1) * 0.08)).toFixed(2))));

  const reportId = `anr_${sha(`${planId}|${mode}|${nowIso()}`).slice(0, 16)}`;
  const report = {
    reportId,
    planId,
    workflowRunId,
    generatedAt: nowIso(),
    mode,
    partial,
    executiveSummary: partial
      ? "Preliminary analysis prepared within timebox; additional depth can be generated on demand."
      : "Analysis synthesized from EvidencePack and available CAT outputs.",
    options,
    recommendation:
      options.length > 1
        ? `Prefer "${options[1].title}" for a balanced tradeoff between risk and speed.`
        : "Proceed with conservative rollout until more evidence is available.",
    assumptions: [
      "Evidence sources are representative of current context.",
      "CAT outputs are trustworthy for the scoped workflow.",
      "Governance policy thresholds remain unchanged during execution.",
    ],
    confidence: {
      score: confidenceScore,
      sensitivities: [
        "Source freshness (recency window)",
        "Completeness of CAT node outputs",
        "Policy/risk tolerance changes",
      ],
    },
    evidencePackId: evidencePack.pack_id,
    nodeOutputRefs: nodeRefs,
  };

  const store = readStore();
  store.reportsById[reportId] = report;
  store.planToReportId[planId] = reportId;
  writeStore(store);
  return report;
}

