"use client";

import React from "react";

export default function RightInspectorPane() {
  return (
    <aside className="h-full border-l border-slate-900/80 bg-slate-950/80 p-3 flex flex-col overflow-y-auto space-y-4">

      {/* Title */}
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Inspector
      </div>

      {/* Environment card */}
      <InspectorCard title="Environment">
        <Item label="Plan" value="Bronze (static)" />
        <Item label="Model" value="GPT-5.1 Thinking (static)" />
        <Item label="Environment" value="Local Dev (static)" />
      </InspectorCard>

      {/* Context card */}
      <InspectorCard title="Context">
        <Item label="Project" value="rocketgpt-vNext" />
        <Item label="Branch" value="main" />
        <Item label="Updated" value="Just now" />
      </InspectorCard>

      {/* Rate limit card */}
      <InspectorCard title="Rate Limit">
        <Item label="Requests Used" value="12 / 100 (static)" />
        <Item label="Tokens Remaining" value="—" />
        <Item label="Reset In" value="59m (static)" />
      </InspectorCard>

      {/* Debug tools card */}
      <InspectorCard title="Debug Tools">
        <button className="w-full text-left rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-200 hover:bg-slate-900">
          Show Logs
        </button>
        <button className="w-full text-left rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-200 hover:bg-slate-900">
          Clear State
        </button>
        <button className="w-full text-left rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-200 hover:bg-slate-900">
          Open Console
        </button>
      </InspectorCard>

      {/* Footer */}
      <div className="pt-2 text-[10px] text-slate-600 border-t border-slate-900/70">
        Inspector uses static mock data.  
        Dynamic context binding will be added later.
      </div>

    </aside>
  );
}

/* Reusable inspector card */
function InspectorCard({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-2">
      <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/* Reusable item row */
function Item({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300">{value}</span>
    </div>
  );
}

