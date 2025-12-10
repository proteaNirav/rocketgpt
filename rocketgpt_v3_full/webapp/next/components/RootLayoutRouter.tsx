"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Shell from "../components/layout/Shell";
import { ConsoleAppShell } from "@/components/console/app-shell";

export default function RootLayoutRouter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Console routes → full-screen console shell (no Header, no outer main)
  if (pathname?.startsWith("/console")) {
    return (
      <ConsoleAppShell>
        {children}
      </ConsoleAppShell>
    );
  }

  // Default pages → Header + centered content shell
  return (
    <>
      <Header />
      <main className="w-full px-4 py-6">
        <Shell>{children}</Shell>
      </main>
    </>
  );
}
