export type ChatRequestBody = {
  message: string;
  modeProfileId?: string;
};

export type WorkflowStep = {
  stage: string;
  purpose: string;
  model: string;
};

export type AutoResponse = {
  kind: "auto";
  reply: string;
  modeProfileId: string;  // "auto-smart-router"
  chosenModel: string;    // e.g. "db-gpt-4.1"
  reason: string;         // why that model was selected
  timestamp: string;
};

export type WorkflowResponse = {
  kind: "workflow";
  reply: string;
  modeProfileId: string;   // e.g. "workflow-multi-model-orchestrator"
  workflowPlan: WorkflowStep[];
  timestamp: string;
};

export type DirectResponse = {
  kind: "direct";
  reply: string;
  modeProfileId: string;
  targetModel: string;     // usually same as modeProfileId
  timestamp: string;
};

export type ChatResponse = AutoResponse | WorkflowResponse | DirectResponse;
