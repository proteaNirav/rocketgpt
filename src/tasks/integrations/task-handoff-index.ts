import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskHandoffDefinition } from "./task-handoff-definition";
import type { TaskHandoffFlowId } from "./task-handoff-flow-id";

const HANDOFF_FLOWS: TaskHandoffDefinition[] = [
  {
    flowId: "consortium_to_brain_oversight",
    sourceRole: "consortium",
    targetRole: "brain",
    taskFamily: "governance",
    description: "Consortium issues bounded oversight or review work to the Brain.",
    integrationId: "brain-consortium-oversight",
    moduleReference: "src/tasks/integrations/brain-consortium-oversight-task-flow.ts",
  },
  {
    flowId: "pm_to_learner_planning",
    sourceRole: "platform_pm",
    targetRole: "learner",
    taskFamily: "research",
    description: "PM issues bounded planning or study work to Learner layers.",
    integrationId: "pm-learner-planning",
    moduleReference: "src/tasks/integrations/pm-learner-planning-task-flow.ts",
    notes: ["program_manager also participates as an owner role in the same handoff family"],
  },
  {
    flowId: "learner_to_builder_work_unit",
    sourceRole: "learner",
    targetRole: "builder",
    taskFamily: "implementation",
    description: "Learner issues bounded implementation work-units to Builder layers.",
    integrationId: "learner-builder-work-unit",
    moduleReference: "src/tasks/integrations/learner-builder-work-unit-flow.ts",
    notes: ["learner_lead and builder_lead variants reuse the same shared task path"],
  },
  {
    flowId: "builder_to_cats_execution",
    sourceRole: "builder",
    targetRole: "cats",
    taskFamily: "operations",
    description: "Builder issues bounded execution handoffs to CATS.",
    integrationId: "builder-cats-execution",
    moduleReference: "src/tasks/integrations/builder-cats-execution-task-flow.ts",
    notes: ["builder_lead also participates as an owner role in the same handoff family"],
  },
  {
    flowId: "cats_to_os_runtime",
    sourceRole: "cats",
    targetRole: "os",
    taskFamily: "operations",
    description: "CATS issue bounded runtime execution handoffs to OS-facing layers.",
    integrationId: "cats-os-runtime",
    moduleReference: "src/tasks/integrations/cats-os-runtime-task-flow.ts",
  },
];

export function listHandoffFlows(): TaskHandoffDefinition[] {
  return HANDOFF_FLOWS.map(cloneDefinition);
}

export function getHandoffFlow(flowId: TaskHandoffFlowId): TaskHandoffDefinition | null {
  const flow = HANDOFF_FLOWS.find((item) => item.flowId === flowId);
  return flow ? cloneDefinition(flow) : null;
}

export function listHandoffFlowsBySourceRole(role: TaskOwnerRole): TaskHandoffDefinition[] {
  return HANDOFF_FLOWS.filter((item) => item.sourceRole === role).map(cloneDefinition);
}

export function listHandoffFlowsByTargetRole(role: TaskOwnerRole): TaskHandoffDefinition[] {
  return HANDOFF_FLOWS.filter((item) => item.targetRole === role).map(cloneDefinition);
}

function cloneDefinition(definition: TaskHandoffDefinition): TaskHandoffDefinition {
  return {
    ...definition,
    notes: definition.notes ? [...definition.notes] : undefined,
  };
}
