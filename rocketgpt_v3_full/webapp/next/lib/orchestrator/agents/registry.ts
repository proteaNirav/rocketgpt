import type { AgentDefinition } from "./types";

/**
 * Core agent registry:
 * This is the "neuron list" – the primary set of agents that
 * the Neural Orchestrator can route tasks to.
 *
 * NOTE: This is intentionally static for now. In later phases,
 * this can be backed by a DB or config file.
 */
export const AGENTS: AgentDefinition[] = [
  {
    id: "planner-core",
    label: "Planner Core",
    description: "Breaks high-level user goals into structured multi-step plans.",
    kind: "planner",
    capabilities: ["planning", "decomposition", "runbook-drafting"],
    riskLevel: "medium",
    defaultModel: "gpt-4.1-mini",
    enabled: true,
    metadata: {
      priority: 10,
    },
  },
  {
    id: "builder-core",
    label: "Builder Core",
    description: "Writes and edits code, configs, and workflows as per the plan.",
    kind: "builder",
    capabilities: ["codegen", "refactor", "nextjs", "ts", "sql"],
    riskLevel: "high",
    defaultModel: "gpt-4.1",
    enabled: true,
    metadata: {
      priority: 20,
    },
  },
  {
    id: "tester-core",
    label: "Tester Core",
    description: "Generates and executes tests, interprets failures, and suggests fixes.",
    kind: "tester",
    capabilities: ["testing", "playwright", "jest", "integration-tests"],
    riskLevel: "high",
    defaultModel: "gpt-4.1-mini",
    enabled: true,
    metadata: {
      priority: 30,
    },
  },
  {
    id: "research-core",
    label: "Research Core",
    description: "Performs documentation lookup, analysis, and design-time research.",
    kind: "research",
    capabilities: ["docs-search", "analysis", "summarization"],
    riskLevel: "medium",
    defaultModel: "gpt-4.1-mini",
    enabled: true,
    metadata: {
      priority: 40,
    },
  },
  {
    id: "safety-approvals",
    label: "Safety & Approvals",
    description: "Evaluates risk, approvals, and policy checks before execution.",
    kind: "safety",
    capabilities: ["approvals", "policy", "risk"],
    riskLevel: "high",
    defaultModel: "gpt-4.1-mini",
    enabled: true,
    metadata: {
      priority: 5,
      usesApprovalsEngineV9: true,
    },
  },
];

/**
 * Convenience lookup by agent id.
 */
export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id);
}

/**
 * Filter agents by functional kind (planner, builder, tester, etc.).
 */
export function getAgentsByKind(kind: AgentDefinition["kind"]): AgentDefinition[] {
  return AGENTS.filter((a) => a.kind === kind && a.enabled);
}
