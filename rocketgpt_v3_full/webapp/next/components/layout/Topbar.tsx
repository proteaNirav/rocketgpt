"use client";

import { Menu } from "lucide-react";

export default function Topbar({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
          aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="text-xs md:text-sm text-slate-400">
          AI Generalist Orchestrator
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs md:text-sm text-slate-400">
        <span className="hidden sm:inline">
          Plan: Bronze
        </span>
        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.9)]" />
        <span className="hidden sm:inline">Engines healthy</span>
      </div>
    </header>
  );
}
