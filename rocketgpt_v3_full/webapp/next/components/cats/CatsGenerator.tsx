"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { recordCatsUsage } from "@/lib/cats-usage";
import { DynamicCatItem, saveDynamicCat } from "@/lib/cats-dynamic";
import { publishNotification } from "@/lib/notify";

const DOMAIN_OPTIONS = ["dynamic", "ops", "security", "governance", "data", "reporting", "integrations", "analytics"];

const RISK_CONFIG = {
  low: {
    sideEffects: ["read_only"] as const,
    requiresApproval: false,
    passportRequired: false,
  },
  medium: {
    sideEffects: ["read_only", "ledger_write"] as const,
    requiresApproval: true,
    passportRequired: true,
  },
  high: {
    sideEffects: ["read_only", "ledger_write", "workflow_dispatch"] as const,
    requiresApproval: true,
    passportRequired: true,
  },
};

type RiskLevel = keyof typeof RISK_CONFIG;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function toTitleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function keywordTags(goal: string): string[] {
  const words = goal
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
  return Array.from(new Set(words)).slice(0, 8);
}

function makeDynamicId(): string {
  return `RGPT-DYN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildDraft(goal: string, domain: string, risk: RiskLevel, variation: number): DynamicCatItem {
  const cleanGoal = goal.trim();
  const title = toTitleCase(cleanGoal) || "Generated Demo Cat";
  const name = variation === 0 ? title : `${title} v${variation + 1}`;
  const canonical = `cats/${domain || "dynamic"}/${slugify(cleanGoal) || "generated-cat"}${variation > 0 ? `-${variation + 1}` : ""}`;
  const riskConfig = RISK_CONFIG[risk];

  return {
    cat_id: "RGPT-DYN-PREVIEW",
    canonical_name: canonical,
    name,
    purpose: cleanGoal,
    version: "0.1.0",
    status: "proposed",
    owner: "user",
    requires_approval: riskConfig.requiresApproval,
    passport_required: riskConfig.passportRequired,
    allowed_side_effects: [...riskConfig.sideEffects],
    tags: Array.from(new Set([domain || "dynamic", risk, ...keywordTags(goal), "dynamic", "development_pending"])),
    last_updated: new Date().toISOString(),
    source: "dynamic",
  };
}

export default function CatsGenerator() {
  const [goal, setGoal] = useState("");
  const [domain, setDomain] = useState("dynamic");
  const [risk, setRisk] = useState<RiskLevel>("low");
  const [variation, setVariation] = useState(0);
  const [didGenerate, setDidGenerate] = useState(false);
  const [savedCatId, setSavedCatId] = useState<string | null>(null);

  const draft = useMemo(() => buildDraft(goal, domain, risk, variation), [domain, goal, risk, variation]);

  function generate(): void {
    if (!goal.trim()) {
      publishNotification({
        level: "error",
        title: "Goal Required",
        message: "Enter a goal before generating a CAT draft.",
      });
      return;
    }
    setDidGenerate(true);
    publishNotification({
      level: "success",
      title: "Draft Generated",
      message: "Deterministic CAT draft generated.",
    });
  }

  function regenerate(): void {
    if (!goal.trim()) return;
    setVariation((value) => value + 1);
    setDidGenerate(true);
  }

  async function copyJson(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${JSON.stringify(draft, null, 2)}\n`);
      publishNotification({
        level: "success",
        title: "Copied",
        message: "Draft JSON copied to clipboard.",
      });
    } catch {
      publishNotification({
        level: "error",
        title: "Copy Failed",
        message: "Unable to copy JSON in this browser context.",
      });
    }
  }

  function saveToLibrary(): void {
    if (!didGenerate || !goal.trim()) {
      publishNotification({
        level: "warning",
        title: "Generate First",
        message: "Generate a CAT draft before saving.",
      });
      return;
    }

    const saved = saveDynamicCat({
      ...draft,
      cat_id: makeDynamicId(),
      last_updated: new Date().toISOString(),
    });

    recordCatsUsage({
      catId: saved.cat_id,
      canonicalName: saved.canonical_name,
      action: "generator_save",
    });

    setSavedCatId(saved.cat_id);
    publishNotification({
      level: "success",
      title: "Saved",
      message: `${saved.cat_id} saved to CATS Library.`,
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm md:col-span-3">
            Goal / Purpose *
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm">
            Domain
            <select value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
              {DOMAIN_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Risk Level
            <select value={risk} onChange={(event) => setRisk(event.target.value as RiskLevel)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={generate} className="rounded bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black">Generate</button>
            <button type="button" onClick={regenerate} disabled={!goal.trim()} className="rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-40">Regenerate</button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">Generated Draft</h2>
        {!didGenerate ? (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Generate to preview CAT draft JSON.</p>
        ) : (
          <>
            <pre className="mt-3 max-h-[28rem] overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900">
              {JSON.stringify(draft, null, 2)}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={saveToLibrary} className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">Save to Library</button>
              <button type="button" onClick={() => void copyJson()} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Copy JSON</button>
              <button type="button" onClick={() => downloadJson(`${draft.canonical_name.replaceAll("/", "-")}.json`, draft)} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Download JSON</button>
              <Link href="/cats/library" className="rounded border border-gray-300 px-3 py-1.5 text-sm">Open CATS Library</Link>
            </div>
            {savedCatId ? <p className="mt-2 text-sm text-green-700 dark:text-green-300">Saved {savedCatId}.</p> : null}
          </>
        )}
      </section>
    </div>
  );
}
