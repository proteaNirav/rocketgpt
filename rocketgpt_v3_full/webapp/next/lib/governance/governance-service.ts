import {
  appendGovernanceLedgerEvent,
  getRecentCrpsCount,
  insertContainmentEvent,
  insertCrpsExecution,
  insertForesightTask,
  loadPolicyRules,
} from "@/lib/db/governanceRepo";
import { applyContainmentDecision, buildSimulationReport } from "@/lib/governance/containment-engine";
import { buildForesightTask } from "@/lib/governance/foresight-engine";
import { evaluatePolicyRules } from "@/lib/governance/policy-engine";
import { computeCrpsSignature } from "@/lib/governance/risk-scoring";
import type {
  GovernancePostRunInput,
  GovernancePreflightInput,
  GovernancePreflightResult,
} from "@/lib/governance/types";

type GovernanceAction = "allow" | "contain" | "block";

function normalizeAction(level: 1 | 2 | 3): GovernanceAction {
  if (level >= 3) return "block";
  if (level >= 2) return "contain";
  return "allow";
}

function hasRedLine(crps: { impactScore: number; reversibilityScore: number; riskDomains: string[] }): boolean {
  return (
    (crps.impactScore >= 90 && crps.reversibilityScore <= 20) ||
    (crps.riskDomains.includes("legal") && crps.riskDomains.includes("security") && crps.impactScore >= 80)
  );
}

function isPreflightInput(value: any): value is GovernancePreflightInput {
  return (
    value &&
    typeof value === "object" &&
    typeof value.runId === "string" &&
    typeof value.workflowId === "string" &&
    Array.isArray(value.nodes)
  );
}

function toPostRunInput(value: any): GovernancePostRunInput | null {
  if (
    value &&
    typeof value === "object" &&
    typeof value.runId === "string" &&
    typeof value.workflowId === "string" &&
    typeof value.crpsId === "string" &&
    Array.isArray(value.results)
  ) {
    return {
      runId: value.runId,
      workflowId: value.workflowId,
      crpsId: value.crpsId,
      results: value.results,
    };
  }
  return null;
}

export async function evaluateGovernancePreflight(
  input: GovernancePreflightInput
): Promise<GovernancePreflightResult & { decision: GovernanceAction; action: GovernanceAction; result: GovernanceAction }> {
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
  const action = normalizeAction(containment.level);

  const containmentEvent = await insertContainmentEvent({
    runId: input.runId,
    workflowId: input.workflowId,
    crpsId: crps.crpsId,
    level: containment.level,
    decision: containment,
    policyRuleId: policyDecision.matchedRuleId,
    policyRuleName: policyDecision.matchedRuleName,
  });

  await appendGovernanceLedgerEvent({
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
    },
  });

  if (containment.level >= 2) {
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
    decision: action,
    action,
    result: action,
  };
}

export async function governancePreflight(input: any): Promise<any | null> {
  try {
    if (!isPreflightInput(input)) {
      return { decision: "allow", action: "allow", result: "allow" };
    }
    return await evaluateGovernancePreflight(input);
  } catch {
    return { decision: "allow", action: "allow", result: "allow" };
  }
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

export async function governancePostRun(input: any): Promise<void> {
  try {
    const parsed = toPostRunInput(input);
    if (parsed) {
      await logGovernancePostRun(parsed);
      return;
    }

    await appendGovernanceLedgerEvent({
      eventType: "risk_eval",
      runId: typeof input?.runId === "string" ? input.runId : null,
      workflowId: typeof input?.workflowId === "string" ? input.workflowId : (typeof input?.route === "string" ? input.route : "orchestrator.run"),
      crpsId: typeof input?.crpsId === "string" ? input.crpsId : null,
      payload: {
        phase: "post_run",
        outcome: input?.outcome ?? "unknown",
        http_status: input?.http_status ?? null,
        response_summary: input?.response_summary ?? null,
        when: input?.when ?? new Date().toISOString(),
      },
    });
  } catch {
    // best-effort
  }
}

export const evaluateGovernancePostRun = governancePostRun;
export const postRun = governancePostRun;
