'use client'

import { mockPrompts } from './data/prompts.data'

export default function PromptsPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Prompts Library</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockPrompts.map((prompt) => (
          <div
            key={prompt.id}
            className="rounded-lg border border-gray-700 bg-gray-900 p-4 shadow-sm"
          >
            <h2 className="text-lg font-bold text-sky-400">{prompt.name}</h2>
            <p className="text-gray-300 mt-2">{prompt.purpose}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {prompt.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-slate-800 rounded-md text-xs text-slate-200"
                >
                  #{tag}
                </span>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-3">Updated: {prompt.updatedAt}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
