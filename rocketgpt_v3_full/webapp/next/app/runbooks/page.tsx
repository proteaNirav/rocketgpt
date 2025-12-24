"use client";

type RunbookItem = {
  id: string;
  title: string;
  summary: string;
  steps: number;
  updatedAt: string;
};

const mockRunbooks: RunbookItem[] = [
  {
    id: "rb-001",
    title: "Daily Health Check",
    summary: "Runs health-check endpoints and verifies system uptime.",
    steps: 4,
    updatedAt: "2025-11-20",
  },
  {
    id: "rb-002",
    title: "CI/CD Repair Workflow",
    summary: "Repairs failing GitHub Actions jobs with retry logic.",
    steps: 6,
    updatedAt: "2025-11-19",
  },
  {
    id: "rb-003",
    title: "DB Performance Sweep",
    summary: "Checks slow queries and performs automated index recommendations.",
    steps: 5,
    updatedAt: "2025-11-17",
  },
];

export default function RunbooksPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Runbooks</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockRunbooks.map((rb) => (
          <div
            key={rb.id}
            className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold text-sky-400">{rb.title}</h2>
            <p className="text-gray-300 mt-2">{rb.summary}</p>

            <p className="text-xs text-gray-400 mt-3">
              Steps: {rb.steps} • Updated: {rb.updatedAt}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
