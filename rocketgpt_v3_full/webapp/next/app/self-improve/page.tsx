"use client";

export default function SelfImprovePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Self-Improve – v4 Core AI</h1>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status card */}
        <div className="col-span-1 rounded-lg border border-gray-700 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">Status</h2>
          <p className="text-xs text-slate-400 mb-3">
            This is a placeholder console. The actual self-improve workflow runs via GitHub Actions and backend services.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Engine ready for v4 Core AI
          </div>
        </div>

        {/* Next actions */}
        <div className="col-span-1 rounded-lg border border-gray-700 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            Next Actions (Planned)
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
            <li>Show live status from <code>/api/self-improve/status</code>.</li>
            <li>List backlog items (IMP-0001, IMP-0002, ...).</li>
            <li>Trigger self-improve runs from UI (via PRs only).</li>
          </ul>
        </div>

        {/* Safety notes */}
        <div className="col-span-1 rounded-lg border border-gray-700 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            Safety & Governance
          </h2>
          <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
            <li>Self-improve must never push directly to <code>main</code>.</li>
            <li>Changes flow via PR + CI + policy_gate.</li>
            <li>All AI edits remain reviewable and auditable.</li>
          </ul>
        </div>
      </section>

      {/* Backlog & history placeholders */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            Backlog (placeholder)
          </h2>
          <p className="text-xs text-slate-300">
            In the next iteration, this section will show the self-improve backlog
            (e.g. IMP-0001: Improve prompts UX, IMP-0002: Harden text-guard, etc.).
          </p>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-2">
            History (placeholder)
          </h2>
          <p className="text-xs text-slate-300">
            This area will show recent self-improve runs, their outcomes, and links
            to GitHub PRs created by the automation.
          </p>
        </div>
      </section>
    </div>
  );
}
