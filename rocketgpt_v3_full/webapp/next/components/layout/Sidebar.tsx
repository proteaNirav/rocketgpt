"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Core",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Sessions", href: "/sessions" },
      { label: "Prompts", href: "/prompts" },
    ],
  },
  {
    title: "Automation",
    items: [
      { label: "Runbooks", href: "/runbooks" },
    ],
  },
  {
    title: "Improvement",
    items: [
      // NOTE: currently mounted at /super/self-improve
      { label: "Self-Improve", href: "/super/self-improve" },
    ],
  },
  {
    title: "Observability",
    items: [
      { label: "Logs", href: "/logs" },
    ],
  },
  {
    title: "Plans & Admin",
    items: [
      // NOTE: currently mounted at /super/limits
      { label: "Plans & Limits", href: "/super/limits" },
      { label: "Models", href: "/models" },
      { label: "Admin", href: "/admin" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-r w-64 min-h-full hidden md:flex md:flex-col bg-background">
      <div className="p-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Navigation
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </div>

            <div className="space-y-1">
              {section.items.map((item) => {
                const isRoot = item.href === "/";
                const active = isRoot
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);

                const baseClasses =
                  "flex items-center rounded-md px-3 py-2 text-xs transition-colors border-l-2";
                const activeClasses =
                  "bg-primary/10 text-primary border-l-primary";
                const inactiveClasses =
                  "text-muted-foreground border-l-transparent hover:bg-muted hover:text-foreground";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${baseClasses} ${
                      active ? activeClasses : inactiveClasses
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
