import type { RuntimeMode } from './runtime-mode.types'

/**
 * What each Runtime Mode is allowed to do.
 * This file is SECURITY-CRITICAL.
 */
export const RuntimePermissions: Record<
  RuntimeMode,
  {
    allowRead: boolean
    allowWrite: boolean
    allowWorkflowTrigger: boolean
    allowCodeMutation: boolean
    allowPolicyMutation: boolean
    allowAutoHeal: boolean
  }
> = {
  OFFLINE: {
    allowRead: true,
    allowWrite: false,
    allowWorkflowTrigger: false,
    allowCodeMutation: false,
    allowPolicyMutation: false,
    allowAutoHeal: false,
  },

  SAFE: {
    allowRead: true,
    allowWrite: true,
    allowWorkflowTrigger: false,
    allowCodeMutation: false,
    allowPolicyMutation: false,
    allowAutoHeal: false,
  },

  SUPERVISED: {
    allowRead: true,
    allowWrite: true,
    allowWorkflowTrigger: true,
    allowCodeMutation: false,
    allowPolicyMutation: false,
    allowAutoHeal: true,
  },

  AUTONOMOUS: {
    allowRead: true,
    allowWrite: true,
    allowWorkflowTrigger: true,
    allowCodeMutation: true,
    allowPolicyMutation: false,
    allowAutoHeal: true,
  },

  SELF_EVOLUTION: {
    allowRead: false,
    allowWrite: false,
    allowWorkflowTrigger: false,
    allowCodeMutation: false,
    allowPolicyMutation: false,
    allowAutoHeal: false,
  },
}
