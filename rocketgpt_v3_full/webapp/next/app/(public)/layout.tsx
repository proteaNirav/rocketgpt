import Link from "next/link";

import { isDemoMode } from "@/lib/demo-mode";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const demoMode = isDemoMode();

  return (
    <div className="space-y-6">
      <header className="w-full rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-200">
            <Link href="/cats/library" className="hover:underline">
              CATS Library
            </Link>
            <Link href="/cats/create" className="hover:underline">
              Create CAT
            </Link>
            <Link href="/cats/generator" className="hover:underline">
              CATS Generator
            </Link>
            <Link href="/cats/reports" className="hover:underline">
              CATS Reports
            </Link>
            <Link href="/cats/approvals" className="hover:underline">
              Approvals
            </Link>
            <Link href="/workflows/builder" className="hover:underline">
              Workflow Builder
            </Link>
          </nav>
          {demoMode ? (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
              Demo mode (Supabase not configured)
            </span>
          ) : null}
        </div>
      </header>
      <section>{children}</section>
    </div>
  );
}
