// app/super/self-improve/page.tsx

"use client";
import { useState } from "react";

export default function SelfImprovePage() {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const pillars = [
    {
      title: "1. Clear Goals",
      description:
        "RocketGPT only self-improves when there is a clear, measurable goal – not randomly. Every change must map to a concrete outcome.",
      items: [
        "Each self-improvement run must declare a reason / goal.",
        "Goals are aligned with safety, reliability, and usefulness.",
        "No changes are applied if the goal is missing or vague.",
      ],
    },
    {
      title: "2. Safe Experiments",
      description:
        "All improvements are treated as experiments first – behind guardrails, in small, reversible steps.",
      items: [
        "Changes go through PRs and CI checks – never direct to main.",
        "Workflows like text-guard, policy-gate, and CI must stay green.",
        "High-risk changes are isolated to branches and feature flags.",
      ],
    },
    {
      title: "3. Feedback Loop",
      description:
        "RocketGPT learns from outcomes, not assumptions – it keeps what works, and rolls back what doesn’t.",
      items: [
        "Track whether a change actually improved things (or not).",
        "Roll back or adjust changes that cause regressions.",
        "Continuously refine based on real usage and tests.",
      ],
    },
  ];

  const rules = [
    "RocketGPT must never bypass safety, policy, or human review in the name of 'self-improvement'.",
    "Any automation that can change code, workflows, or config must be observable, reversible, and logged.",
    "Human owners (you!) always have the final say for critical decisions and production changes.",
  ];

  const lifecycle = [
    "1. Notice a problem or opportunity.",
    "2. Define a clear, measurable goal.",
    "3. Plan a small, safe experiment.",
    "4. Apply via PR + CI + guardrails.",
    "5. Observe impact and metrics.",
    "6. Keep, tweak, or roll back.",
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Self-Improving RocketGPT
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          This page explains how RocketGPT is allowed to self-improve – the
          guardrails, feedback loops, and responsibilities that keep it safe,
          predictable, and useful.
        </p>
      </header>

      {/* Pillars grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Core Pillars of Self-Improvement
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-xl border bg-background/60 p-4 shadow-sm space-y-2"
            >
              <h3 className="text-base font-semibold">{pillar.title}</h3>
              <p className="text-xs text-muted-foreground">
                {pillar.description}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {pillar.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[3px] h-1.5 w-1.5 rounded-full bg-foreground/60" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Lifecycle + Rules */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-background/60 p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            Self-Improvement Lifecycle
          </h2>
          <p className="text-sm text-muted-foreground">
            A simple loop that RocketGPT follows whenever it tries to improve
            itself.
          </p>
          <ol className="mt-2 space-y-1 text-sm text-muted-foreground list-decimal list-inside">
            {lifecycle.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="space-y-3 rounded-xl border bg-background/60 p-4 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">
            Non-Negotiable Rules
          </h2>
          <p className="text-sm text-muted-foreground">
            These rules can&apos;t be overridden by any automation or agent.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </section>

            {/* Live controls + responsibility */}
      <section className="grid gap-4 md:grid-cols-[2fr,3fr] items-start">
        <div className="rounded-2xl border border-border/60 bg-background/80 p-5 md:p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Run Self-Improvement from RocketGPT
          </h2>
          <p className="text-xs text-muted-foreground">
            Use these entry points to drive RocketGPT&apos;s own evolution. Over
            time, this panel will be powered by real metrics, last runs, and
            suggested next steps from RocketGPT itself.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="https://github.com/proteaNirav/rocketgpt/actions?query=workflow%3A%22Self+Improve%22"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-border/80 bg-background px-3 py-1.5 hover:bg-background/70 transition"
            >
              View Self-Improve workflow
            </a>
            <a
              href="https://github.com/proteaNirav/rocketgpt/blob/main/docs/self-improvement-charter.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-border/80 bg-background px-3 py-1.5 hover:bg-background/70 transition"
            >
              Open Self-Improvement Charter
            </a>
            <button
  type="button"
  onClick={async () => {
    try {
      setRunning(true);
      setMessage("");

      const res = await fetch("/api/self-improve/run", {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Self-improve workflow triggered successfully.");
      } else {
        setMessage("Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      setMessage("Error: " + (err as any).message);
    } finally {
      setRunning(false);
    }
  }}
  className="inline-flex items-center rounded-full border border-border/80 bg-background px-3 py-1.5 hover:bg-background/70 transition"
>
  {running ? "Running..." : "Trigger self-improve run"}
</button>

{message && (
  <p className="text-xs text-muted-foreground mt-1">{message}</p>
)}

          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background/80 p-5 md:p-6 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight">
            Owner Responsibility
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            You remain the owner and final decision-maker. RocketGPT can propose,
            test, and validate improvements – but it should always keep you in
            the loop, especially for anything that touches production, money, or
            safety. Self-improvement must never bypass safety, policy, or human
            review.
          </p>
        </div>
      </section>

    </div>
  );
}
