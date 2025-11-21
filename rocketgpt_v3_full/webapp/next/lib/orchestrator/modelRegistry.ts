/**
 * Model Registry for RocketGPT Orchestrator
 *
 * This maps high-level `modeProfileId` values (used in the UI + /api/chat)
 * to underlying provider + model information.
 *
 * NOTE:
 *  - This is a v1 static registry.
 *  - In future, it can be backed by DB + /api/models/modes (top 100 list, show 10 per category).
 */

export type ProviderId = "openai" | "anthropic" | "google" | "orchestrator";

export type ModelCategory =
  | "auto"
  | "llm"
  | "development"
  | "db"
  | "bigdata"
  | "maths"
  | "finance"
  | "uiux"
  | "workflow";

export type ModelRegistryEntry = {
  /** High-level profile id used in the UI + ModeContext (e.g. "dev-gpt-5.1") */
  id: string;

  /** Human readable label ("GPT 5.1", "Claude 3.5 Sonnet", etc.) */
  label: string;

  /** Provider identifier (OpenAI, Anthropic, Google or Orchestrator meta-profile) */
  provider: ProviderId;

  /**
   * Provider-specific model identifier:
   *   - e.g. "gpt-5.1" for OpenAI
   *   - e.g. "claude-3-5-sonnet" for Anthropic
   *   - e.g. "gemini-1.5-pro" for Google
   *   - "auto-router" / "workflow-orchestrator" for orchestrator meta profiles
   */
  providerModel: string;

  /** Logical category used in ModelSelector (LLM, Development, DB, etc.) */
  category: ModelCategory;

  /** Optional notes or hints (tier, usage, comments) */
  notes?: string;
};

export const MODEL_REGISTRY: ModelRegistryEntry[] = [
  // --- Orchestrator meta profiles ---
  {
    id: "auto-smart-router",
    label: "Auto (RocketGPT decides)",
    provider: "orchestrator",
    providerModel: "auto-router",
    category: "auto",
    notes: "Router that decides the best engine per request",
  },
  {
    id: "workflow-multi-model-orchestrator",
    label: "Multi-model Orchestrator (demo)",
    provider: "orchestrator",
    providerModel: "workflow-orchestrator",
    category: "workflow",
    notes: "Executes chained flows across multiple engines",
  },

  // --- LLM general ---
  {
    id: "llm-gpt-5.1",
    label: "GPT 5.1",
    provider: "openai",
    providerModel: "gpt-5.1",
    category: "llm",
    notes: "Flagship general-purpose LLM",
  },
  {
    id: "llm-gpt-4.1",
    label: "GPT 4.1",
    provider: "openai",
    providerModel: "gpt-4.1",
    category: "llm",
    notes: "Reliable, balanced reasoning",
  },
  {
    id: "llm-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
    providerModel: "claude-3-5-sonnet",
    category: "llm",
    notes: "Strong reasoning and long-form answers",
  },

  // --- Development ---
  {
    id: "dev-gpt-5.1",
    label: "GPT 5.1 (Dev)",
    provider: "openai",
    providerModel: "gpt-5.1",
    category: "development",
    notes: "Coding, refactors, architecture",
  },
  {
    id: "dev-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet (Dev)",
    provider: "anthropic",
    providerModel: "claude-3-5-sonnet",
    category: "development",
    notes: "Code review, reasoning-heavy dev tasks",
  },

  // --- DB / SQL ---
  {
    id: "db-gpt-4.1",
    label: "GPT 4.1 (SQL & Schema)",
    provider: "openai",
    providerModel: "gpt-4.1",
    category: "db",
    notes: "SQL queries, indexing, schema planning",
  },
  {
    id: "db-gemini-1.5-pro",
    label: "Gemini 1.5 Pro (SQL)",
    provider: "google",
    providerModel: "gemini-1.5-pro",
    category: "db",
    notes: "Data modelling, analytics queries",
  },

  // --- Big Data / Pipelines ---
  {
    id: "bigdata-gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "google",
    providerModel: "gemini-1.5-pro",
    category: "bigdata",
    notes: "Pipelines, ETL, lakehouse patterns",
  },
  {
    id: "bigdata-gpt-4.1",
    label: "GPT 4.1",
    provider: "openai",
    providerModel: "gpt-4.1",
    category: "bigdata",
    notes: "Architectures, cluster planning, docs",
  },

  // --- Maths ---
  {
    id: "maths-gpt-4.1",
    label: "GPT 4.1",
    provider: "openai",
    providerModel: "gpt-4.1",
    category: "maths",
    notes: "Math-heavy reasoning and proofs",
  },
  {
    id: "maths-gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    provider: "google",
    providerModel: "gemini-1.5-flash",
    category: "maths",
    notes: "Fast calculations and numeric work",
  },

  // --- Finance ---
  {
    id: "finance-gpt-4.1",
    label: "GPT 4.1",
    provider: "openai",
    providerModel: "gpt-4.1",
    category: "finance",
    notes: "Financial analysis, reports, summaries",
  },
  {
    id: "finance-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
    providerModel: "claude-3-5-sonnet",
    category: "finance",
    notes: "Narrative financial commentary",
  },

  // --- UI/UX ---
  {
    id: "uiux-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "anthropic",
    providerModel: "claude-3-5-sonnet",
    category: "uiux",
    notes: "Product copy, UX flows, IA",
  },
  {
    id: "uiux-gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    provider: "google",
    providerModel: "gemini-1.5-flash",
    category: "uiux",
    notes: "Variant ideas, fast iterations",
  },
];

/**
 * Helper: find a registry entry by id.
 * Returns undefined if not found.
 */
export function getModelProfile(id: string | null | undefined): ModelRegistryEntry | undefined {
  if (!id) return undefined;
  return MODEL_REGISTRY.find((m) => m.id === id);
}
