import type { TaskOwnerRole } from "../types/task-owner-role";
import type { TaskSourceLayer } from "../types/task-source-layer";

const DEFAULT_ROLE_BY_LAYER: Record<TaskSourceLayer, TaskOwnerRole> = {
  brain: "brain",
  builder: "builder",
  cats: "cats",
  consortium: "consortium",
  governance: "task_governor",
  human: "program_manager",
  learner: "learner",
  os: "os",
  pm: "platform_pm",
};

export function mapSourceLayerToDefaultOwnerRole(sourceLayer: TaskSourceLayer): TaskOwnerRole {
  return DEFAULT_ROLE_BY_LAYER[sourceLayer];
}
