import Link from "next/link";
import React from "react";
import { ModelSelector } from "./ModelSelector";

export function Topbar() {
  return (
    <header className="h-14 border-b flex items-center justify-between px-4">
      {/* Left side: app name / breadcrumb */}
      <div className="text-sm font-medium truncate">
        RocketGPT
      </div>

      {/* Right side: model selector + plan/status */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <ModelSelector />

        <div className="hidden sm:flex items-center gap-3">
          <Link href="/plans" className="hover:underline">
            Plan: Bronze
          </Link>
          <span>Status: OK</span>
        </div>
      </div>
    </header>
  );
}
