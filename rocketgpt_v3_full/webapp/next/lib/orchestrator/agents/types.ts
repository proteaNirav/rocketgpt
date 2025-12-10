export type AgentKind =
  | "planner"
  | "builder"
  | "tester"
  | "research"
  | "safety";

export type AgentRiskLevel = "low" | "medium" | "high";

/**
 * High-level description of what an Agent can do.
 * This is intentionally generic so different backends (OpenAI, Gemini, etc.)
 * can implement their own internal details.
 */
export interface AgentDefinition {
  /** Unique ID used internally and in routing. */
  id: string;

  /** Human-friendly name for UI. */
  label: string;

  /** Short description for logs / tooltips. */
  description: string;

  /** High-level functional role (planner, builder, tester, etc.). */
  kind: AgentKind;

  /** List of capability tags for routing (e.g., "nextjs", "sql", "lint"). */
  capabilities: string[];

  /** Risk profile used for approvals routing. */
  riskLevel: AgentRiskLevel;

  /** Default LLM / backend this agent prefers. */
  defaultModel: string;

  /** Whether this agent is currently enabled. */
  enabled: boolean;

  /** Optional extra metadata for future expansion. */
  metadata?: Record<string, any>;
}
