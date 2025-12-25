export type LibraryRiskLevel = "low" | "medium" | "high";

export interface LibraryDefinition {
  /** Unique ID used internally for routing. */
  id: string;

  /** Human-friendly name. */
  name: string;

  /** Domain / problem space (e.g. "sql", "nextjs", "licensing"). */
  domain: string;

  /** Short description of what this library knows or can do. */
  description: string;

  /** Tags used for matching with goals and agents. */
  tags: string[];

  /** Risk profile for approvals engine. */
  riskLevel: LibraryRiskLevel;

  /** Preferred agents that know how to use this library. */
  preferredAgents: string[];

  /** Semantic version of the library content / schema. */
  version: string;

  /** Arbitrary metadata for future use. */
  metadata?: Record<string, any>;
}
