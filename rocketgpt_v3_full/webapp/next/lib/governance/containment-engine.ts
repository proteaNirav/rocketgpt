import type {
  ContainmentDecision,
  CrpsSignature,
  PolicyDecision,
  SimulationReport,
} from "./types";
import type { WorkflowNode } from "../workflow-types";

export function buildSimulationReport(
  workflowId: string,
  nodes: WorkflowNode[],
  crps: CrpsSignature
): SimulationReport {
  const nodeNames = nodes.map((node) => node.name).slice(0, 3).join(", ");
  const domains = crps.riskDomains.join(", ") || "general";
  return {
    horizons: {
      d30: `30-day: Monitor initial effects for workflow ${workflowId} across ${domains}.`,
      d90: `90-day: Validate control stability and drift for CATs ${nodeNames || "selected workflow nodes"}.`,
      d365: `365-day: Audit long-term reversibility and policy compliance footprints.`,
    },
    secondOrderChecklist: [
      "Could this workflow shift incentives toward unsafe shortcuts?",
      "Could repeated execution increase legal/privacy exposure?",
      "Could containment bypasses compound over time?",
      "Are rollback and incident response paths tested?",
    ],
    alternatives: [
      {
        strategy: "aggressive",
        expectedBenefit: "Fastest throughput and immediate optimization gains.",
        riskTradeoff: "Higher blast radius and policy drift risk.",
      },
      {
        strategy: "balanced",
        expectedBenefit: "Moderate gains with staged rollout controls.",
        riskTradeoff: "Requires monitoring overhead.",
      },
      {
        strategy: "conservative",
        expectedBenefit: "Lowest operational risk and highest reversibility.",
        riskTradeoff: "Slower delivery and reduced immediate impact.",
      },
    ],
  };
}

export function applyContainmentDecision(policyDecision: PolicyDecision): ContainmentDecision {
  const action = policyDecision.action;
  return {
    level: action.level,
    allowExecution: !action.blockExecution && !action.requireApprovalCheckpoint,
    requireApprovalCheckpoint: action.requireApprovalCheckpoint ?? false,
    disableAutoExec: action.disableAutoExec ?? false,
    lockParameters: action.lockParameters ?? [],
    requireSimulationReport: action.requireSimulationReport ?? false,
    blockExecution: action.blockExecution ?? false,
    openIncident: action.openIncident ?? false,
    silent: action.silent ?? false,
    explanation: policyDecision.explanation,
  };
}

