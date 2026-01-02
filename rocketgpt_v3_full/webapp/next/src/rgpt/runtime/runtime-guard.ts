import type { RuntimeMode } from "./runtime-mode.types";
import { RuntimePermissions } from "./runtime-permissions";

export type GuardedAction =
  | "READ"
  | "WRITE"
  | "WORKFLOW_TRIGGER"
  | "CODE_MUTATION"
  | "POLICY_MUTATION"
  | "AUTO_HEAL";

export function assertRuntimePermission(
  mode: RuntimeMode,
  action: GuardedAction
): { allowed: true } | { allowed: false; reason: string } {
  const p = RuntimePermissions[mode];

  if (!p) {
    return { allowed: false, reason: `Unknown runtime mode: ${mode}` };
  }

  switch (action) {
    case "READ":
      return p.allowRead
        ? { allowed: true }
        : { allowed: false, reason: "READ not allowed in this mode" };

    case "WRITE":
      return p.allowWrite
        ? { allowed: true }
        : { allowed: false, reason: "WRITE not allowed in this mode" };

    case "WORKFLOW_TRIGGER":
      return p.allowWorkflowTrigger
        ? { allowed: true }
        : { allowed: false, reason: "Workflow trigger not allowed in this mode" };

    case "CODE_MUTATION":
      return p.allowCodeMutation
        ? { allowed: true }
        : { allowed: false, reason: "Code mutation not allowed in this mode" };

    case "POLICY_MUTATION":
      return p.allowPolicyMutation
        ? { allowed: true }
        : { allowed: false, reason: "Policy mutation not allowed in this mode" };

    case "AUTO_HEAL":
      return p.allowAutoHeal
        ? { allowed: true }
        : { allowed: false, reason: "Auto-heal not allowed in this mode" };

    default:
      return { allowed: false, reason: "Unknown action" };
  }
}
