import { CatCatalogItem } from "@/lib/cats-seed";
import { WorkflowArtifact, WorkflowNode } from "@/lib/workflow-types";

export type WorkflowIssue = {
  code: string;
  message: string;
  node_id?: string;
};

export type WorkflowValidationResult = {
  errors: WorkflowIssue[];
  warnings: WorkflowIssue[];
  signals: Array<{ code: string; message: string }>;
  node: Record<string, { errors: WorkflowIssue[]; warnings: WorkflowIssue[] }>;
  governanceSummary: {
    anyRequiresApproval: boolean;
    anyRequiresPassport: boolean;
    sideEffects: string[];
    anyElevated: boolean;
  };
};

type FlowProfile = {
  consumes: string[];
  produces: string[];
};

const CATEGORY_FLOW: Record<string, FlowProfile> = {
  analytics: { consumes: ["telemetry", "metrics"], produces: ["insights"] },
  reporting: { consumes: ["insights"], produces: ["report"] },
  governance: { consumes: ["workflow"], produces: ["approvals", "policy_decision"] },
  replay: { consumes: ["workflow"], produces: ["replay_artifact"] },
  data: { consumes: [], produces: ["telemetry", "metrics"] },
  ops: { consumes: [], produces: ["telemetry"] },
  integrations: { consumes: [], produces: ["metrics"] },
};

function inferCategory(node: WorkflowNode, seedById: Map<string, CatCatalogItem>): string {
  const seed = seedById.get(node.cat_id);
  const canonical = seed?.canonical_name || node.canonical_name || "";
  const parts = canonical.split("/");
  return (parts[1] || "").toLowerCase();
}

function normalizeInitParams(initParams: unknown): { ok: boolean; value?: Record<string, unknown> } {
  if (typeof initParams === "string") {
    try {
      const parsed = JSON.parse(initParams);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { ok: false };
      return { ok: true, value: parsed as Record<string, unknown> };
    } catch {
      return { ok: false };
    }
  }

  if (typeof initParams !== "object" || initParams === null || Array.isArray(initParams)) return { ok: false };
  return { ok: true, value: initParams as Record<string, unknown> };
}

export function validateWorkflow(
  workflow: WorkflowArtifact,
  seedCats: CatCatalogItem[]
): WorkflowValidationResult {
  const errors: WorkflowIssue[] = [];
  const warnings: WorkflowIssue[] = [];
  const signals: Array<{ code: string; message: string }> = [];
  const nodeMap: Record<string, { errors: WorkflowIssue[]; warnings: WorkflowIssue[] }> = {};

  const seedById = new Map(seedCats.map((item) => [item.cat_id, item]));
  const produced = new Set<string>(["workflow"]);

  let anyRequiresApproval = false;
  let anyRequiresPassport = false;
  const sideEffects = new Set<string>();

  const firstExecutionIndex = workflow.nodes.findIndex((node) => inferCategory(node, seedById) !== "governance");

  for (const node of workflow.nodes) {
    nodeMap[node.node_id] = { errors: [], warnings: [] };
  }

  function pushError(issue: WorkflowIssue) {
    errors.push(issue);
    if (issue.node_id) nodeMap[issue.node_id]?.errors.push(issue);
  }

  function pushWarning(issue: WorkflowIssue) {
    warnings.push(issue);
    if (issue.node_id) nodeMap[issue.node_id]?.warnings.push(issue);
  }

  workflow.nodes.forEach((node, index) => {
    const seed = seedById.get(node.cat_id);
    const category = inferCategory(node, seedById);
    const profile = CATEGORY_FLOW[category] || { consumes: [], produces: [] };
    const tags = new Set((seed?.tags || []).map((tag) => tag.toLowerCase()));

    if (!seed) {
      pushWarning({
        code: "seed-not-found",
        message: `Node ${node.cat_id} not found in seed catalog.`,
        node_id: node.node_id,
      });
    }

    const init = normalizeInitParams(node.init_params);
    if (!init.ok) {
      pushError({
        code: "invalid-init-params-json",
        message: `Node ${node.name} has invalid init_params JSON.`,
        node_id: node.node_id,
      });
    }

    if (!node.expected_behavior?.trim() && (node.expected_outputs || []).length === 0) {
      pushWarning({
        code: "missing-expected-result",
        message: `Node ${node.name} has no expected behavior and no expected outputs.`,
        node_id: node.node_id,
      });
    }

    node.allowed_side_effects.forEach((effect) => sideEffects.add(effect));
    if (node.requires_approval) anyRequiresApproval = true;
    if (node.passport_required) anyRequiresPassport = true;

    for (const need of profile.consumes) {
      if (!produced.has(need)) {
        pushWarning({
          code: "unmet-consumes",
          message: `Node ${node.name} expects '${need}' from prior nodes but it was not produced.`,
          node_id: node.node_id,
        });
      }
    }

    if (category === "reporting") {
      const hasPriorAnalyticsLike = workflow.nodes
        .slice(0, index)
        .some((priorNode) => {
          const priorCategory = inferCategory(priorNode, seedById);
          const priorSeed = seedById.get(priorNode.cat_id);
          const priorTags = new Set((priorSeed?.tags || []).map((tag) => tag.toLowerCase()));
          return (
            priorCategory === "analytics" ||
            priorCategory === "data" ||
            priorTags.has("telemetry") ||
            priorTags.has("metrics")
          );
        });
      if (!hasPriorAnalyticsLike) {
        pushWarning({
          code: "reporting-before-analytics",
          message: `Reporting node ${node.name} appears before telemetry/analytics producers.`,
          node_id: node.node_id,
        });
      }
    }

    if (category === "governance" && firstExecutionIndex >= 0 && index > firstExecutionIndex) {
      pushWarning({
        code: "governance-after-execution",
        message: `Governance node ${node.name} appears after execution-oriented nodes.`,
        node_id: node.node_id,
      });
    }

    profile.produces.forEach((out) => produced.add(out));
    if (tags.has("telemetry")) produced.add("telemetry");
    if (tags.has("metrics")) produced.add("metrics");
    if (tags.has("insights")) produced.add("insights");
  });

  const anyElevated = sideEffects.has("workflow_dispatch");
  if (anyElevated) {
    pushWarning({
      code: "elevated-workflow-dispatch",
      message: "At least one node requests workflow_dispatch side-effect. Elevated governance is required.",
    });
    signals.push({
      code: "governance-elevated",
      message: "Workflow includes workflow_dispatch side-effect.",
    });
  }
  if (anyRequiresPassport) {
    signals.push({
      code: "passport-required",
      message: "One or more nodes require passports.",
    });
  }
  if (anyRequiresApproval) {
    signals.push({
      code: "approval-required",
      message: "One or more nodes require approval.",
    });
  }

  return {
    errors,
    warnings,
    signals,
    node: nodeMap,
    governanceSummary: {
      anyRequiresApproval,
      anyRequiresPassport,
      sideEffects: Array.from(sideEffects).sort(),
      anyElevated,
    },
  };
}
