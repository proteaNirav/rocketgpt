"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  BookOpen,
  Workflow,
  Sparkles,
  BarChart2,
  Cpu,
  FileText,
  Settings,
  ShieldCheck,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Sessions", href: "/sessions", icon: MessageCircle },
  { label: "Prompts", href: "/prompts", icon: BookOpen },
  { label: "Runbooks", href: "/runbooks", icon: Workflow },
  { label: "Self-Improve", href: "/self-improve", icon: Sparkles },
  { label: "Plans & Limits", href: "/plans", icon: BarChart2 },
  { label: "Models", href: "/models", icon: Cpu },
  { label: "Logs", href: "/logs", icon: FileText },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-800 bg-slate-950/80 backdrop-blur-sm transition-all duration-200",
        collapsed ? "w-14" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
        <div
          className={cn(
            "font-semibold tracking-tight text-slate-50 truncate",
            collapsed && "hidden"
          )}
          title="RocketGPT"
        >
          RocketGPT
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 text-xs text-slate-200 hover:bg-slate-800"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-1 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                "text-slate-300 hover:bg-slate-800/70 hover:text-slate-50",
                isActive && "bg-slate-800 text-slate-50"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive && "text-sky-400"
                )}
              />
              {!collapsed && (
                <span className="truncate text-xs md:text-sm">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-2 py-3 text-[10px] text-slate-500 text-center">
        {!collapsed && <>v3 → v4 Core AI</>}
      </div>
    </aside>
  );
}

// Local cn helper
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
