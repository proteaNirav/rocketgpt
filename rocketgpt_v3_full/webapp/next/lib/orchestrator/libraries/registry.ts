import type { LibraryDefinition } from "./types";

/**
 * Library registry:
 * Each entry represents a "knowledge neuron" – a domain that
 * specific agents can leverage (SQL, Next.js, HRMS, Licensing, etc.).
 */
export const LIBRARIES: LibraryDefinition[] = [
  {
    id: "sql-optimization",
    name: "SQL Optimization Library",
    domain: "sql",
    description: "Patterns, heuristics, and helpers for MS SQL performance tuning.",
    tags: ["sql", "tuning", "indexing", "execution-plan"],
    riskLevel: "medium",
    preferredAgents: ["builder-core", "tester-core"],
    version: "1.0.0",
    metadata: {
      engine: "mssql",
    },
  },
  {
    id: "nextjs-ui",
    name: "Next.js UI Library",
    domain: "nextjs",
    description: "UI patterns, layout rules, and best practices for RocketGPT Next.js frontend.",
    tags: ["nextjs", "react", "ui", "tailwind"],
    riskLevel: "medium",
    preferredAgents: ["builder-core"],
    version: "1.0.0",
    metadata: {
      repoArea: "webapp/next",
    },
  },
  {
    id: "licensing-core",
    name: "Licensing & Monetization Library",
    domain: "licensing",
    description: "Concepts and helpers for Protea licensing, activation, and monetization flows.",
    tags: ["licensing", "monetization", "protea"],
    riskLevel: "high",
    preferredAgents: ["planner-core", "builder-core"],
    version: "1.0.0",
    metadata: {
      relatedProjects: ["LicenseManager", "ProLicenseApp"],
    },
  },
  {
    id: "cctv-centralization",
    name: "CCTV Centralization Library",
    domain: "cctv",
    description: "Topology, storage, and analytics design patterns for CCTV centralization.",
    tags: ["cctv", "infrastructure", "analytics"],
    riskLevel: "medium",
    preferredAgents: ["planner-core", "research-core"],
    version: "1.0.0",
    metadata: {
      industry: "manufacturing",
    },
  },
];

/**
 * Get a library by its ID.
 */
export function getLibraryById(id: string): LibraryDefinition | undefined {
  return LIBRARIES.find((l) => l.id === id);
}

/**
 * Get libraries matching a given domain or tag.
 */
export function findLibrariesByTagOrDomain(
  query: string
): LibraryDefinition[] {
  const q = query.toLowerCase();
  return LIBRARIES.filter((l) => {
    return (
      l.domain.toLowerCase() === q ||
      l.tags.some((t) => t.toLowerCase() === q)
    );
  });
}
