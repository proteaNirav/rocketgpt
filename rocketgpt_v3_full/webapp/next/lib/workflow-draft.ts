import { CatSuggestion } from "@/lib/cats-suggest";
import { WorkflowArtifact, WorkflowNode } from "@/lib/workflow-types";

export const WORKFLOW_DRAFT_LATEST_KEY = "rgpt_workflow_draft_latest";
export const WORKFLOW_DRAFT_PREFIX = "rgpt_workflow_draft_";

const DEFAULT_OUTPUTS = [
  "Success criteria defined",
  "Edge cases reviewed",
  "Evidence artifacts expected",
  "Rollback path documented",
];

function makeDraftId(): string {
  return `draft-${Date.now()}`;
}

export function buildNodeFromSuggestion(suggestion: CatSuggestion, order: number): WorkflowNode {
  return {
    node_id: `node-${order}-${suggestion.item.cat_id.toLowerCase()}`,
    cat_id: suggestion.item.cat_id,
    canonical_name: suggestion.item.canonical_name,
    name: suggestion.item.name,
    purpose: suggestion.item.purpose,
    allowed_side_effects: suggestion.item.allowed_side_effects,
    requires_approval: suggestion.item.requires_approval,
    passport_required: suggestion.item.passport_required,
    selection_reason: suggestion.reason,
    score: suggestion.score,
    init_params: {},
    expected_behavior: `Run ${suggestion.item.name} to progress workflow intent.`,
    expected_outputs: DEFAULT_OUTPUTS.map((label, index) => ({
      id: `${suggestion.item.cat_id}-out-${index + 1}`,
      label,
      checked: false,
    })),
  };
}

export function buildWorkflowArtifactFromSuggestions(
  suggestions: CatSuggestion[],
  conversationText: string,
  draftId?: string,
  source: WorkflowArtifact["source"] = "story"
): WorkflowArtifact {
  const nodes = suggestions.map((suggestion, index) => buildNodeFromSuggestion(suggestion, index + 1));
  const unionSet = new Set<WorkflowNode["allowed_side_effects"][number]>();
  for (const node of nodes) {
    for (const effect of node.allowed_side_effects) unionSet.add(effect);
  }
  const union = Array.from(unionSet).sort() as WorkflowArtifact["side_effects_summary"]["union"];

  return {
    artifact_type: "cats_workflow_story_draft",
    draft_id: draftId || makeDraftId(),
    generated_at_utc: new Date().toISOString(),
    source,
    conversation_text: conversationText,
    nodes,
    side_effects_summary: {
      union,
      includes_workflow_dispatch: union.includes("workflow_dispatch"),
    },
  };
}

export function saveWorkflowDraftToStorage(artifact: WorkflowArtifact): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKFLOW_DRAFT_LATEST_KEY, JSON.stringify(artifact));
  window.localStorage.setItem(`${WORKFLOW_DRAFT_PREFIX}${artifact.draft_id}`, JSON.stringify(artifact));
}

export function loadWorkflowDraftFromStorage(draftId?: string | null): WorkflowArtifact | null {
  if (typeof window === "undefined") return null;
  const key = draftId ? `${WORKFLOW_DRAFT_PREFIX}${draftId}` : WORKFLOW_DRAFT_LATEST_KEY;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkflowArtifact;
    if (!parsed || parsed.artifact_type !== "cats_workflow_story_draft" || !Array.isArray(parsed.nodes)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
