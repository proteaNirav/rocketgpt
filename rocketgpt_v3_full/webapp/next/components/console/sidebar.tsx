// components/console/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageCircle,
  FileText,
  Workflow,
  Sparkles,
  Gauge,
  Box,
  ListTree,
  Shield,
  Settings,
  Info,
} from "lucide-react";

const items = [
  { href: "/console", label: "Dashboard", icon: LayoutDashboard },
  { href: "/console/sessions", label: "Sessions", icon: MessageCircle },
  { href: "/console/prompts", label: "Prompts Library", icon: FileText },
  { href: "/console/runbooks", label: "Runbooks", icon: Workflow },
  { href: "/console/self-improve", label: "Self-Improve", icon: Sparkles },
  { href: "/console/plans-limits", label: "Plans & Limits", icon: Gauge },
  { href: "/console/models", label: "Models", icon: Box },
  { href: "/console/logs", label: "Logs", icon: ListTree },
  { href: "/console/admin", label: "Admin", icon: Shield },
  { href: "/console/settings", label: "Settings", icon: Settings },
  { href: "/console/about", label: "About", icon: Info },
];

export function ConsoleSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <span className="text-sm font-bold text-primary">RG</span>
        </div>
        <span className="font-semibold">RocketGPT</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
