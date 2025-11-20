// app/console/page.tsx
export default function ConsoleDashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of RocketGPT health, usage and activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">System Health</div>
          <div className="mt-2 text-2xl font-semibold">OK</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Rate Limits Usage</div>
          <div className="mt-2 text-2xl font-semibold">27%</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Prompts</div>
          <div className="mt-2 text-2xl font-semibold">142</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Active Sessions</div>
          <div className="mt-2 text-2xl font-semibold">5</div>
        </div>
      </div>
    </div>
  );
}
