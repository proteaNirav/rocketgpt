import Link from "next/link";
import React from "react";

export function Topbar() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4">
      {/* Left side: page title / breadcrumb */}
      <div className="text-sm font-medium">
        RocketGPT
      </div>

      {/* Right side: plan badge, status, theme toggle, user menu (later) */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Link href="/plans" className="hover:underline">Plan: Bronze</Link>
        <span>Status: OK</span>
        {/* TODO: Add theme toggle, user menu etc. */}
      </div>
    </header>
  );
}

