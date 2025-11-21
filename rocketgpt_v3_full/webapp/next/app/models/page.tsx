"use client";

export default function ModelsPage() {
  const mockModels = [
    {
      id: "m-001",
      name: "ChatGPT 5.1",
      provider: "OpenAI",
      status: "Active",
      updatedAt: "2025-11-18",
    },
    {
      id: "m-002",
      name: "Claude 3.7",
      provider: "Anthropic",
      status: "Active",
      updatedAt: "2025-11-17",
    },
    {
      id: "m-003",
      name: "Gemini Flash 2.2",
      provider: "Google",
      status: "Inactive",
      updatedAt: "2025-11-16",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Models</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockModels.map((model) => (
          <div
            key={model.id}
            className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold text-sky-400">{model.name}</h2>
            <p className="text-gray-300">
              Provider: <span className="text-slate-200">{model.provider}</span>
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Status: {model.status}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Updated: {model.updatedAt}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-400">
        This is a placeholder grid. Live models will later load from repository settings and backend registry.
      </p>
    </div>
  );
}
