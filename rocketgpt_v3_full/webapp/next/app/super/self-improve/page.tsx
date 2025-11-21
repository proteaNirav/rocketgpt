import React from "react";

export const dynamic = "force-dynamic";

export default function SelfImprovePage() {
  return (
    <div className="h-full w-full flex flex-col gap-6 p-6 overflow-auto">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Self-Improve Console
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          This console is the control room for RocketGPT&apos;s own evolution.
          Use it to review improvement ideas, track recent self-improve runs,
          and monitor how the system is getting better over time.
        </p>
      </header>

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Backlog items
          </h2>
          <div className="text-2xl font-semibold">—</div>
          <p className="text-xs text-muted-foreground">
            Future: pull counts from <code>self_improve_backlog.json</code> or API.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent self-improve runs
          </h2>
          <div className="text-2xl font-semibold">—</div>
          <p className="text-xs text-muted-foreground">
            Future: show latest GitHub / workflow runs for self-improve.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Status
          </h2>
          <div className="text-sm font-medium">v4 Core AI – Preview</div>
          <p className="text-xs text-muted-foreground">
            This page is wired and ready. You can safely go live and evolve
            the console in future versions.
          </p>
        </div>
      </section>

      {/* Details / placeholder body */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Improvement backlog</h2>
          <p className="text-sm text-muted-foreground">
            In future iterations, this panel will read from RocketGPT&apos;s
            self-improvement backlog (for example:
            <code className="ml-1 text-xs">config/self_improve_backlog.json</code>)
            and show items grouped by priority (P0 / P1 / P2) and area
            (UI, DX, Reliability, Security, etc.).
          </p>
          <p className="text-xs text-muted-foreground">
            For now this is a static placeholder so the route is stable for go-live.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">How this will evolve</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Hook into GitHub Actions self-improve workflows.</li>
            <li>Display last N self-improve runs with status and logs.</li>
            <li>Allow triggering safe, pre-defined self-improve jobs.</li>
            <li>Show links to docs, runbooks, and safety policies.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
