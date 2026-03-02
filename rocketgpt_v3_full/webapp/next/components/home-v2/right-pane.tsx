'use client'

export function HomeV2RightPane() {
  return (
    <div className="w-72 border-l border-border p-4 space-y-3 hidden xl:block">
      <h2 className="text-lg font-semibold">Tools</h2>
      <div className="rounded border border-border p-3 bg-card text-sm">
        <div className="font-medium mb-1">Context</div>
        <div className="text-xs text-muted-foreground">Context features will appear here.</div>
      </div>

      <div className="rounded border border-border p-3 bg-card text-sm">
        <div className="font-medium mb-1">Prompts</div>
        <div className="text-xs text-muted-foreground">Quick prompt access will live here.</div>
      </div>

      <div className="rounded border border-border p-3 bg-card text-sm">
        <div className="font-medium mb-1">Runbooks</div>
        <div className="text-xs text-muted-foreground">
          Recommended runbooks will be shown here.
        </div>
      </div>
    </div>
  )
}
