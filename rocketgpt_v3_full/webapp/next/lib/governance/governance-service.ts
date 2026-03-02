import {
  appendGovernanceLedgerEvent,
  getRecentCrpsCount,
  insertContainmentEvent,
  insertCrpsExecution,
  insertForesightTask,
  loadPolicyRules,
} from "@/lib/db/governanceRepo";
import { submitApproval } from "@/lib/db/approvalsRepo";
import { applyContainmentDecision, buildSimulationReport } from "@/lib/governance/containment-engine";
import { buildForesightTask } from "@/lib/governance/foresight-engine";
import { evaluatePolicyRules } from "@/lib/governance/policy-engine";
import { computeCrpsSignature } from "@/lib/governance/risk-scoring";
import type {
  GovernancePostRunInput,
  GovernancePreflightInput,
  GovernancePreflightResult,
} from "@/lib/governance/types";

function hasRedLine(crps: { impactScore: number; reversibilityScore: number; riskDomains: string[] }): boolean {
  return (
    (crps.impactScore >= 90 && crps.reversibilityScore <= 20) ||
    (crps.riskDomains.includes("legal") && crps.riskDomains.includes("security") && crps.impactScore >= 80)
  );
}

export async function evaluateGovernancePreflight(
  input: GovernancePreflightInput
): Promise<GovernancePreflightResult> {
  const crps = computeCrpsSignature({
    workflowId: input.workflowId,
    nodes: input.nodes,
    params: input.params,
    overrideRate: 0,
    evidenceRefs: [],
  });

  await insertCrpsExecution(input.runId, input.actorId ?? null, input.orgId ?? null, crps);

  const repeatCount = await getRecentCrpsCount(crps.crpsId, 30);
  const redLineMatch = hasRedLine(crps);
  const approvalsMissing = crps.recommendedLevel >= 2;

  let simulationReport = null;
  try {
    simulationReport = buildSimulationReport(input.workflowId, input.nodes, crps);
  } catch {
    simulationReport = null;
  }

  const policyRules = await loadPolicyRules();
  const policyDecision = evaluatePolicyRules(policyRules, crps, {
    repeatCount,
    redLineMatch,
    approvalsMissing,
    simulationMissing: simulationReport === null,
  });
  const containment = applyContainmentDecision(policyDecision);

  const containmentEvent = await insertContainmentEvent({
    runId: input.runId,
    workflowId: input.workflowId,
    crpsId: crps.crpsId,
    level: containment.level,
    decision: containment,
    policyRuleId: policyDecision.matchedRuleId,
    policyRuleName: policyDecision.matchedRuleName,
  });

  const riskLedger = await appendGovernanceLedgerEvent({
    eventType: "risk_eval",
    runId: input.runId,
    workflowId: input.workflowId,
    crpsId: crps.crpsId,
    payload: { crps, repeatCount, redLineMatch, containmentLevel: containment.level },
  });

  await appendGovernanceLedgerEvent({
    eventType: "containment_applied",
    runId: input.runId,
    workflowId: input.workflowId,
    crpsId: crps.crpsId,
    payload: {
      containmentEventId: containmentEvent.id,
      policyDecision,
      containment,
      evidenceRefs: [riskLedger.id],
    },
  });

  if (containment.level >= 2) {
    const approval = await submitApproval({
      request_type: "governance.containment",
      request_title: `Governance L${containment.level} checkpoint: ${input.workflowId}`,
      payload: {
        runId: input.runId,
        workflowId: input.workflowId,
        crpsId: crps.crpsId,
        level: containment.level,
        explanation: containment.explanation,
      },
      priority: containment.level >= 3 ? "critical" : "high",
      risk_level: containment.level >= 3 ? "high" : "medium",
      requested_by: "governance-monitor",
    });
    await appendGovernanceLedgerEvent({
      eventType: "containment_applied",
      runId: input.runId,
      workflowId: input.workflowId,
      crpsId: crps.crpsId,
      payload: {
        approvalCheckpointId: approval.id,
        containmentLevel: containment.level,
      },
    });

    const foresightTask = buildForesightTask(crps, containment);
    const created = await insertForesightTask({
      crpsId: foresightTask.crpsId,
      summary: foresightTask.summary,
      whyItMatters: foresightTask.whyItMatters,
      scenarios: foresightTask.scenarios as Record<string, unknown>,
      stopConditions: foresightTask.stopConditions,
      mitigationIfLate: foresightTask.mitigationIfLate,
      recommendedPolicyChanges: foresightTask.recommendedPolicyChanges,
      recommendedCatPatches: foresightTask.recommendedCatPatches,
      domainQueues: foresightTask.domainQueues,
      status: foresightTask.status,
    });
    await appendGovernanceLedgerEvent({
      eventType: "foresight_task_created",
      runId: input.runId,
      workflowId: input.workflowId,
      crpsId: crps.crpsId,
      payload: { foresightTaskId: created.id, summary: foresightTask.summary },
    });
  }

  return {
    crps,
    policyDecision,
    containment,
    simulationReport,
  };
}

export async function logGovernancePostRun(input: GovernancePostRunInput): Promise<void> {
  const successCount = input.results.filter((result) => result.status === "success").length;
  const failedCount = input.results.filter((result) => result.status === "failed").length;
  await appendGovernanceLedgerEvent({
    eventType: "risk_eval",
    runId: input.runId,
    workflowId: input.workflowId,
    crpsId: input.crpsId,
    payload: {
      phase: "post_run",
      resultSummary: {
        total: input.results.length,
        successCount,
        failedCount,
      },
    },
  });
}
