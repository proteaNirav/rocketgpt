import path from "node:path";
import {
  ensureSelfImproveDirs,
  evidenceDir,
  findingsDir,
  makeId,
  nowIso,
  proposalsDir,
  readJson,
  relToRepo,
  repoRoot,
  writeJson,
} from "./paths.mjs";
import { runAllDetectors } from "./detectors.mjs";
import { rankFindings } from "./ranking.mjs";
import { validateProposal } from "./proposal-validator.mjs";
import { writeDecisionLedger, writeExecutionLedger } from "./ledger.mjs";
import { validateAnalysisReport, validateWorkflowPlan } from "../../../src/contracts/index.mjs";

const defaultDisallowedPaths = ["**/.env*", "**/secrets/**", "infra/**", ".github/workflows/**", ".git/**"];

export function validateContractBoundaryPayload(payload) {
  const result = {
    workflowPlan: payload?.workflowPlan ? validateWorkflowPlan(payload.workflowPlan) : { ok: true, errors: [] },
    analysisReport: payload?.analysisReport ? validateAnalysisReport(payload.analysisReport) : { ok: true, errors: [] },
  };
  return {
    ok: result.workflowPlan.ok && result.analysisReport.ok,
    ...result,
  };
}

function getAllowedPathsForFinding(finding) {
  if (finding.type === "replay_drift") {
    return ["apps/core-api/replay/**", "apps/core-api/**", "docs/self_improve/**"];
  }
  if (finding.type === "policy_violation" || finding.type === "security_risk") {
    return ["apps/core-api/**", "rocketgpt_v3_full/webapp/next/**", "docs/self_improve/**"];
  }
  return ["rocketgpt_v3_full/webapp/next/**", "apps/core-api/**", "docs/self_improve/**"];
}

function checksForFinding(finding) {
  const checks = ["policy_gate", "safe_mode", "tests"];
  if (finding.type === "replay_drift" || finding.type === "ci_failure") checks.push("replay");
  return checks;
}

function buildChangesForFinding(finding, proposalId) {
  if (finding.type === "ci_failure" && finding.metadata?.autofix?.kind === "prettier") {
    return [
      {
        kind: "code",
        path: "rocketgpt_v3_full/webapp/next",
        rationale: "deterministic:prettier:rocketgpt_v3_full/webapp/next",
      },
    ];
  }
  if (finding.type === "ci_failure" && finding.metadata?.autofix?.kind === "missing_type_import") {
    const symbol = String(finding.metadata.autofix.symbol);
    const targetPath = Array.isArray(finding.impacted_paths) && finding.impacted_paths[0]
      ? finding.impacted_paths[0]
      : "rocketgpt_v3_full/webapp/next/app/self-improve/page.tsx";
    return [
      {
        kind: "code",
        path: targetPath,
        rationale: `deterministic:type-import:${symbol}:react`,
      },
    ];
  }
  return [
    {
      kind: "docs",
      path: `docs/self_improve/proposals/${proposalId}.todo.md`,
      rationale: "manual_placeholder:Add bounded TODO patch instructions for a human-approved fix.",
    },
  ];
}

export function makeProposalFromFinding(finding) {
  const proposalId = makeId("SI");
  const requiredChecks = checksForFinding(finding);
  return {
    proposal_id: proposalId,
    finding: {
      type: finding.type,
      severity: finding.severity,
      summary: finding.summary,
      evidence_refs: finding.evidence_refs || [],
    },
    plan: {
      scope: {
        allowed_paths: getAllowedPathsForFinding(finding),
        disallowed_paths: defaultDisallowedPaths,
        max_files_changed: 15,
      },
      changes: buildChangesForFinding(finding, proposalId),
      risk: finding.severity === "critical" ? "high" : finding.severity === "error" ? "medium" : "low",
      rollback: "git restore --source=HEAD~1 -- .",
    },
    verification: {
      required_checks: requiredChecks,
      commands: requiredChecks.map((c) => `node tools/self-improve/index.mjs verify --check ${c}`),
    },
    approvals: {
      requires_human: true,
      auto_merge_allowed: false,
    },
  };
}

async function writeProposalMeta(proposalId, meta) {
  const metaPath = path.join(proposalsDir, `${proposalId}.meta.json`);
  await writeJson(metaPath, meta);
}

async function loadFindingsState() {
  const p = path.join(findingsDir, "latest.json");
  return (await readJson(p, { findings: [] })) || { findings: [] };
}

export async function listFindings() {
  const state = await loadFindingsState();
  return state.findings || [];
}

export async function listProposals() {
  await ensureSelfImproveDirs();
  const fs = await import("node:fs/promises");
  const entries = await fs.readdir(proposalsDir).catch(() => []);
  const proposalFiles = entries.filter((f) => f.endsWith(".json") && !f.endsWith(".meta.json"));
  const out = [];
  for (const file of proposalFiles) {
    const proposal = await readJson(path.join(proposalsDir, file), null);
    if (!proposal) continue;
    const meta = await readJson(path.join(proposalsDir, `${proposal.proposal_id}.meta.json`), { status: "drafted" });
    out.push({ proposal, status: meta.status || "drafted", meta });
  }
  out.sort((a, b) => String(b.proposal.proposal_id).localeCompare(String(a.proposal.proposal_id)));
  return out;
}

export async function runScan({ actor = "service:self-improve", ciArtifactPath = "", policyArtifactPaths = [], replayArtifactPath = "" } = {}) {
  await ensureSelfImproveDirs();
  const scanId = makeId("SCAN");
  const scanEvidenceRoot = path.join(evidenceDir, scanId);
  const findings = await runAllDetectors({
    evidenceRoot: scanEvidenceRoot,
    ciArtifactPath: ciArtifactPath ? path.resolve(repoRoot, ciArtifactPath) : "",
    policyArtifactPaths: policyArtifactPaths.map((p) => path.resolve(repoRoot, p)),
    replayArtifactPath: replayArtifactPath ? path.resolve(repoRoot, replayArtifactPath) : "",
  });

  const ranked = rankFindings(findings);
  const findingsState = {
    scan_id: scanId,
    scanned_at: nowIso(),
    evidence_root: relToRepo(scanEvidenceRoot),
    findings: ranked,
  };
  await writeJson(path.join(findingsDir, "latest.json"), findingsState);
  const scanDecision = await writeDecisionLedger({
    actor,
    action: "scan_completed",
    proposal_id: null,
    finding_count: ranked.length,
    evidence_refs: [relToRepo(scanEvidenceRoot)],
  });
  const scanExecution = await writeExecutionLedger({
    actor,
    action: "scan_completed",
    proposal_id: null,
    finding_count: ranked.length,
    evidence_refs: [relToRepo(scanEvidenceRoot)],
    decision_ledger_id: scanDecision.ledger_id,
  });

  const drafted = [];
  for (const finding of ranked.slice(0, Math.min(5, ranked.length))) {
    const proposal = makeProposalFromFinding(finding);
    const proposalPath = path.join(proposalsDir, `${proposal.proposal_id}.json`);
    await writeJson(proposalPath, proposal);
    await writeProposalMeta(proposal.proposal_id, {
      status: "drafted",
      updated_at: nowIso(),
      source_finding_id: finding.id,
      scan_id: scanId,
    });
    const decisionEntry = await writeDecisionLedger({
      actor,
      action: "proposal_drafted",
      proposal_id: proposal.proposal_id,
      finding_id: finding.id,
      evidence_refs: [relToRepo(scanEvidenceRoot)],
      proposal_path: relToRepo(proposalPath),
    });
    const executionEntry = await writeExecutionLedger({
      actor,
      action: "scan_proposal_drafted",
      proposal_id: proposal.proposal_id,
      finding_id: finding.id,
      evidence_refs: [relToRepo(scanEvidenceRoot)],
      decision_ledger_id: decisionEntry.ledger_id,
    });
    drafted.push({
      proposal,
      decision_ledger_id: decisionEntry.ledger_id,
      execution_ledger_id: executionEntry.ledger_id,
    });
  }

  return {
    scan_id: scanId,
    findings: ranked,
    drafted,
    decision_ledger_id: scanDecision.ledger_id,
    execution_ledger_id: scanExecution.ledger_id,
  };
}

export async function proposeForFinding({ findingId, actor = "service:self-improve" }) {
  const findings = await listFindings();
  const finding = findings.find((f) => f.id === findingId);
  if (!finding) {
    throw new Error(`Finding not found: ${findingId}`);
  }
  const proposal = makeProposalFromFinding(finding);
  const validation = await validateProposal(proposal);
  if (!validation.ok) {
    throw new Error(`Proposal failed validation: ${validation.errors.join("; ")}`);
  }
  const proposalPath = path.join(proposalsDir, `${proposal.proposal_id}.json`);
  await writeJson(proposalPath, proposal);
  await writeProposalMeta(proposal.proposal_id, {
    status: "validated",
    updated_at: nowIso(),
    finding_id: findingId,
  });
  const decisionEntry = await writeDecisionLedger({
    actor,
    action: "proposal_validated",
    proposal_id: proposal.proposal_id,
    finding_id: findingId,
    evidence_refs: finding.evidence_refs || [],
    proposal_path: relToRepo(proposalPath),
  });
  const executionEntry = await writeExecutionLedger({
    actor,
    action: "propose_for_finding",
    proposal_id: proposal.proposal_id,
    finding_id: findingId,
    evidence_refs: finding.evidence_refs || [],
    decision_ledger_id: decisionEntry.ledger_id,
  });
  return {
    proposal,
    validation,
    decision_ledger_id: decisionEntry.ledger_id,
    execution_ledger_id: executionEntry.ledger_id,
  };
}

export async function validateStoredProposal({ proposalId, actor = "service:self-improve" }) {
  const proposalPath = path.join(proposalsDir, `${proposalId}.json`);
  const proposal = await readJson(proposalPath, null);
  if (!proposal) {
    throw new Error(`Proposal not found: ${proposalId}`);
  }
  const validation = await validateProposal(proposal);
  if (validation.ok) {
    await writeProposalMeta(proposalId, { status: "validated", updated_at: nowIso() });
  }
  const decisionEntry = await writeDecisionLedger({
    actor,
    action: "proposal_validate_check",
    proposal_id: proposalId,
    result: validation.ok ? "ok" : "fail",
    evidence_refs: [relToRepo(proposalPath)],
  });
  const executionEntry = await writeExecutionLedger({
    actor,
    action: "validate_proposal",
    proposal_id: proposalId,
    result: validation.ok ? "ok" : "fail",
    evidence_refs: [relToRepo(proposalPath)],
    decision_ledger_id: decisionEntry.ledger_id,
  });
  return {
    proposal,
    validation,
    decision_ledger_id: decisionEntry.ledger_id,
    execution_ledger_id: executionEntry.ledger_id,
  };
}
