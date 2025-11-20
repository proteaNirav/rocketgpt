import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RocketGPT · Home",
  description: "Control center for your AI Generalist Orchestrator",
};

const quickLinks = [
  {
    href: "/sessions",
    label: "Sessions",
    badge: "Primary",
    description: "Start a new chat or resume an existing one.",
  },
  {
    href: "/prompts",
    label: "Prompts",
    badge: "Library",
    description: "Browse and manage reusable prompt templates.",
  },
  {
    href: "/runbooks",
    label: "Runbooks",
    badge: "Automation",
    description: "Execute guided workflows and operational playbooks.",
  },
];

const navigationTiles = [
  {
    section: "Operate",
    items: [
      {
        href: "/sessions",
        title: "Sessions",
        description: "Central place to manage all RocketGPT conversations.",
      },
      {
        href: "/console",
        title: "Console",
        description: "Low-level AI console for power users and debugging.",
      },
      {
        href: "/runbooks",
        title: "Runbooks",
        description: "Operational workflows and self-healing playbooks.",
      },
    ],
  },
  {
    section: "Knowledge & Assets",
    items: [
      {
        href: "/prompts",
        title: "Prompts Library",
        description: "Curated prompts, patterns, and reusable instructions.",
      },
      {
        href: "/models",
        title: "Models",
        description: "View and manage available AI models and routing.",
      },
      {
        href: "/logs",
        title: "Logs",
        description: "Inspect system logs, traces, and AI activity.",
      },
    ],
  },
  {
    section: "Governance & Settings",
    items: [
      {
        href: "/plans",
        title: "Plans & Limits",
        description: "Usage limits, plan details, and rate limit insights.",
      },
      {
        href: "/settings",
        title: "Settings",
        description: "Instance configuration, themes, and integration settings.",
      },
      {
        href: "/admin",
        title: "Admin",
        description: "Administrative controls, users, and high-risk actions.",
      },
    ],
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-col gap-6 p-4 pb-10 lg:p-8">
      {/* Header */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
            Welcome to RocketGPT
          </h1>
          <p className="mt-1 text-sm text-muted-foreground lg:text-base">
            Your AI Generalist Orchestrator — manage sessions, automation, and governance from a single control center.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/sessions"
            className="inline-flex items-center rounded-lg border border-transparent bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Start a session
          </Link>
          <Link
            href="/runbooks"
            className="inline-flex items-center rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Open runbooks
          </Link>
        </div>
      </section>

      {/* Top strip: status + quick links */}
      <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Status card (static placeholder, wired to /api/health elsewhere) */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Instance Status
              </h2>
              <p className="mt-1 text-sm text-foreground">
                RocketGPT core is <span className="font-semibold">online</span> and ready.
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Health: <span className="font-semibold text-emerald-500">OK</span></div>
              <div>Plans: <span className="font-semibold">Configured</span></div>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            For detailed status, visit <span className="font-mono text-[11px]">/api/health</span> or the{" "}
            <Link href="/logs" className="underline underline-offset-2">
              Logs
            </Link>{" "}
            page.
          </p>
        </div>

        {/* Quick links */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              Quick start
            </h2>
            <span className="text-xs text-muted-foreground">
              Most common entry points
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex flex-col justify-between rounded-lg border bg-background px-3 py-2 text-sm shadow-sm transition hover:border-primary hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {item.badge}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main navigation grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground lg:text-base">
            Navigate RocketGPT
          </h2>
          <p className="text-xs text-muted-foreground">
            Explore all core areas of the platform.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {navigationTiles.map((group) => (
            <div
              key={group.section}
              className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.section}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group block rounded-lg border border-transparent px-2 py-1.5 text-sm transition hover:border-primary hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-[11px] text-muted-foreground group-hover:text-foreground">
                        Open →
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
