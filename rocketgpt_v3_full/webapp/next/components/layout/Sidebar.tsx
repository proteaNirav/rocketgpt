"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BookOpen,
  Zap,
  CreditCard,
  Cpu,
  ScrollText,
  Shield,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useUIPanels } from "../ui/use-ui-panels";

type NavItem = {
  label: string;
  href: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: "Core",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Sessions", href: "/sessions", icon: MessageSquare },
      { label: "Prompts", href: "/prompts", icon: FileText },
    ],
  },
  {
    title: "Automation",
    items: [{ label: "Runbooks", href: "/runbooks", icon: BookOpen }],
  },
  {
    title: "Improvement",
    items: [
      // NOTE: currently mounted at /super/self-improve
      { label: "Self-Improve", href: "/super/self-improve", icon: Zap },
    ],
  },
  {
    title: "Observability",
    items: [{ label: "Logs", href: "/logs", icon: ScrollText }],
  },
  {
    title: "Plans & Admin",
    items: [
      // NOTE: currently mounted at /super/limits
      { label: "Plans & Limits", href: "/super/limits", icon: CreditCard },
      { label: "Models", href: "/models", icon: Cpu },
      { label: "Admin", href: "/admin", icon: Shield },
      { label: "Settings", href: "/settings", icon: SettingsIcon },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebar, toggleSidebar } = useUIPanels();
  const isCollapsed = !sidebar;

  return (
    <aside
      className={`hidden md:flex flex-col border-r bg-background min-h-screen transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo / header */}
      <div className="px-3 py-4 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-semibold text-primary-foreground">
              RG
            </span>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">RocketGPT</span>
              <span className="text-[11px] text-muted-foreground">
                AI Console
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.title}>
            {!isCollapsed && (
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isRoot = item.href === "/";
                const active = isRoot
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group flex items-center ${
                        isCollapsed ? "justify-center" : "justify-start gap-3"
                      } rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {Icon && (
                        <Icon
                          className="h-4 w-4 flex-shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      {!isCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
