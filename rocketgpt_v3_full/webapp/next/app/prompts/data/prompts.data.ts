export type PromptItem = {
  id: string;
  name: string;
  purpose: string;
  tags: string[];
  updatedAt: string;
};

export const mockPrompts: PromptItem[] = [
  {
    id: "pr-001",
    name: "Daily Status Formatter",
    purpose: "Formats multi-line notes into a structured daily report",
    tags: ["formatting", "daily"],
    updatedAt: "2025-11-20",
  },
  {
    id: "pr-002",
    name: "SQL Optimizer",
    purpose: "Improves a slow SQL query and explains changes",
    tags: ["sql", "optimization"],
    updatedAt: "2025-11-18",
  },
  {
    id: "pr-003",
    name: "Code Reviewer",
    purpose: "Reviews pull requests and produces line-by-line suggestions",
    tags: ["review", "code"],
    updatedAt: "2025-11-15",
  },
];
