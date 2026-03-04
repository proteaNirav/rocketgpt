export type WorkflowOutputCheck = {
  id: string;
  label: string;
  checked: boolean;
};

export type WorkflowNode = {
  node_id: string;
  cat_id: string;
  canonical_name: string;
  name: string;
  purpose: string;
  allowed_side_effects: Array<"none" | "read_only" | "ledger_write" | "workflow_dispatch">;
  requires_approval: boolean;
  passport_required: boolean;
  selection_reason: string;
  score: number;
  init_params: unknown;
  expected_behavior: string;
  expected_outputs: WorkflowOutputCheck[];
};

export type WorkflowArtifact = {
  artifact_type: "cats_workflow_story_draft";
  draft_id: string;
  generated_at_utc: string;
  source: "story" | "builder" | "chat";
  conversation_text: string;
  nodes: WorkflowNode[];
  side_effects_summary: {
    union: Array<"none" | "read_only" | "ledger_write" | "workflow_dispatch">;
    includes_workflow_dispatch: boolean;
  };
};

export type WorkflowResultStatus = "queued" | "running" | "success" | "failed";

export type WorkflowStepResult = {
  stepId: string;
  catId: string;
  status: WorkflowResultStatus;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  outputSummary: string;
  outputJson: Record<string, unknown>;
  artifacts: string[];
};

export type WorkflowRunSnapshot = {
  workflowId: string;
  startedAt: string;
  endedAt: string;
  stopped: boolean;
  results: WorkflowStepResult[];
};

export type WorkflowRunHistoryRecord = {
  runId: string;
  createdAt: string;
  workflow: {
    draftId: string;
    nodes: WorkflowNode[];
  };
  run: WorkflowRunSnapshot;
};
