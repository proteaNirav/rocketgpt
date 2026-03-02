import type { AgentDefinition, AgentKind } from './agents/types'
import { AGENTS, getAgentsByKind } from './agents/registry'
import type { LibraryDefinition } from './libraries/types'
import { LIBRARIES, getLibraryById, findLibrariesByTagOrDomain } from './libraries/registry'

/**
 * Stages that the Neural Orchestrator cares about.
 * (Aligned with Planner / Builder / Tester / Research / Safety.)
 */
export type OrchestratorStage = 'planner' | 'builder' | 'tester' | 'research'

/**
 * High-level goal information provided to the router.
 * This is intentionally lightweight and can be extended later.
 */
export interface OrchestratorGoal {
  /** Optional run identifier, for logging / context. */
  runId?: string

  /** Optional step number in a multi-step plan. */
  step?: number

  /** Stage requesting routing (planner, builder, tester, research). */
  stage: OrchestratorStage

  /**
   * Primary domain of the work (e.g., "sql", "nextjs", "licensing", "cctv").
   * Used to select suitable libraries.
   */
  domain?: string

  /**
   * Additional tags / signals (e.g., ["sql", "tuning"], ["nextjs", "ui"]).
   * Used for finer-grained library matching.
   */
  tags?: string[]

  /** Human-readable description of the goal, for logging / debugging. */
  description: string
}

/**
 * Minimal routing decision, based on IDs only.
 * This is the format other modules can store or pass around.
 */
export interface RoutingDecision {
  agentId: string | null
  libraryIds: string[]
}

/**
 * Resolved routing context with full Agent + Library definitions.
 */
export interface RoutingContext {
  decision: RoutingDecision
  agent: AgentDefinition | null
  libraries: LibraryDefinition[]
}

/**
 * Internal helper – map OrchestratorStage → AgentKind.
 */
function mapStageToAgentKind(stage: OrchestratorStage): AgentKind {
  switch (stage) {
    case 'planner':
      return 'planner'
    case 'builder':
      return 'builder'
    case 'tester':
      return 'tester'
    case 'research':
    default:
      return 'research'
  }
}

/**
 * Choose a single agent for the given stage.
 * - Filters by kind
 * - Requires enabled === true
 * - Prefers lowest metadata.priority if present (default 999)
 */
function selectAgentForStage(stage: OrchestratorStage): AgentDefinition | null {
  const kind = mapStageToAgentKind(stage)
  const candidates = getAgentsByKind(kind)

  if (!candidates.length) {
    return null
  }

  const sorted = [...candidates].sort((a, b) => {
    const pa = typeof a.metadata?.priority === 'number' ? a.metadata!.priority : 999
    const pb = typeof b.metadata?.priority === 'number' ? b.metadata!.priority : 999
    return pa - pb
  })

  return sorted[0] ?? null
}

/**
 * Select one or more libraries based on the goal's domain and tags.
 * - If domain is provided, uses it as primary filter.
 * - Tags are used as secondary matching hints.
 */
function selectLibrariesForGoal(goal: OrchestratorGoal): LibraryDefinition[] {
  const matched = new Map<string, LibraryDefinition>()

  // 1) Domain-based match
  if (goal.domain) {
    const domainMatches = findLibrariesByTagOrDomain(goal.domain)
    for (const lib of domainMatches) {
      matched.set(lib.id, lib)
    }
  }

  // 2) Tag-based match
  if (goal.tags && goal.tags.length > 0) {
    for (const tag of goal.tags) {
      const tagMatches = findLibrariesByTagOrDomain(tag)
      for (const lib of tagMatches) {
        matched.set(lib.id, lib)
      }
    }
  }

  // If nothing matched but we have a domain, try a direct scan
  if (!matched.size && goal.domain) {
    for (const lib of LIBRARIES) {
      if (lib.domain.toLowerCase() === goal.domain.toLowerCase()) {
        matched.set(lib.id, lib)
      }
    }
  }

  return Array.from(matched.values())
}

/**
 * Plan routing for a given goal.
 * Returns IDs only (for storage / external APIs).
 */
export function planRouting(goal: OrchestratorGoal): RoutingDecision {
  const agent = selectAgentForStage(goal.stage)
  const libraries = selectLibrariesForGoal(goal)

  return {
    agentId: agent ? agent.id : null,
    libraryIds: libraries.map((l) => l.id),
  }
}

/**
 * Resolve a RoutingDecision into a full RoutingContext
 * (AgentDefinition + LibraryDefinition[]).
 *
 * If no decision is provided, it is computed from the goal.
 */
export function resolveRouting(goal: OrchestratorGoal, decision?: RoutingDecision): RoutingContext {
  const effectiveDecision = decision ?? planRouting(goal)

  const agent =
    effectiveDecision.agentId != null
      ? (AGENTS.find((a) => a.id === effectiveDecision.agentId) ?? null)
      : null

  const libraries: LibraryDefinition[] = effectiveDecision.libraryIds
    .map((id) => getLibraryById(id))
    .filter((l): l is LibraryDefinition => Boolean(l))

  return {
    decision: effectiveDecision,
    agent,
    libraries,
  }
}
