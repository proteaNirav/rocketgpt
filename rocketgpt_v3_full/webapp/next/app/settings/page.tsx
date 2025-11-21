"use client";

import React, { useState } from "react";

export default function SettingsPage() {
  const [themePref, setThemePref] = useState<"system" | "light" | "dark">("system");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage basic preferences and view environment details for this RocketGPT deployment.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <SectionCard
          title="Profile"
          description="High-level information about the current user context."
        >
          <dl className="space-y-2 text-sm">
            <Row label="Name" value="Nirav (placeholder)" />
            <Row label="Role" value="Admin (placeholder)" />
            <Row label="Email" value="user@example.com" />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            In a future iteration, this section can be wired to Supabase auth and team roles.
          </p>
        </SectionCard>

        {/* Theme */}
        <SectionCard
          title="Appearance"
          description="Control how RocketGPT looks on this device."
        >
          <div className="space-y-3 text-sm">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Theme preference
              </label>
              <div className="flex flex-wrap gap-2">
                <ThemeChip
                  label="System"
                  value="system"
                  current={themePref}
                  onChange={setThemePref}
                />
                <ThemeChip
                  label="Light"
                  value="light"
                  current={themePref}
                  onChange={setThemePref}
                />
                <ThemeChip
                  label="Dark"
                  value="dark"
                  current={themePref}
                  onChange={setThemePref}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              This toggle is local to the page for now. It can be connected to the global theme
              provider in a later step so the entire app responds.
            </p>
          </div>
        </SectionCard>

        {/* API keys */}
        <SectionCard
          title="API keys"
          description="High-level overview of configured providers (values masked)."
        >
          <dl className="space-y-2 text-sm">
            <Row label="OpenAI" value="•••••••••••• (configured)" />
            <Row label="Claude" value="•••••••••••• (configured)" />
            <Row label="Gemini" value="Not configured" />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Real key management should live in secure environment variables and not be exposed in the UI.
          </p>
        </SectionCard>

        {/* Environment */}
        <SectionCard
          title="Environment"
          description="Static deployment hints for this RocketGPT instance."
        >
          <dl className="space-y-2 text-sm">
            <Row label="Environment" value="Production (placeholder)" />
            <Row label="Region" value="Vercel default (placeholder)" />
            <Row label="Build source" value="GitHub · main branch" />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            These values can later be sourced from a health or metadata endpoint (e.g. /api/health).
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm space-y-3 h-full flex flex-col">
      <div>
        <h2 className="text-sm font-semibold leading-none tracking-tight">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        ) : null}
      </div>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground text-right">{value}</dd>
    </div>
  );
}

interface ThemeChipProps {
  label: string;
  value: "system" | "light" | "dark";
  current: "system" | "light" | "dark";
  onChange: (v: "system" | "light" | "dark") => void;
}

function ThemeChip({ label, value, current, onChange }: ThemeChipProps) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background/60 text-muted-foreground hover:bg-muted/40",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
