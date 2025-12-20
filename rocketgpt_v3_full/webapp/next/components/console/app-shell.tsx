// components/console/app-shell.tsx
"use client";

import type { ReactNode } from "react";
import { ConsoleSidebar } from "./sidebar";
import { ConsoleTopbar } from "./topbar";

export function ConsoleAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <ConsoleSidebar />
      <div className="flex flex-1 flex-col">
        <ConsoleTopbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
