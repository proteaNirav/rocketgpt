"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getCatsForUi } from "@/lib/cats-for-ui";
import { recordCatsUsage } from "@/lib/cats-usage";
import { DynamicCatItem, saveDynamicCat } from "@/lib/cats-dynamic";
import { publishNotification } from "@/lib/notify";
import { CatCatalogItem } from "@/lib/cats-seed";

type Step = 1 | 2 | 3;
type SideEffect = CatCatalogItem["allowed_side_effects"][number];
type PassportMode = "required" | "optional" | "not_required";
type ApprovalMode = "required" | "optional" | "not_required";

const DOMAIN_OPTIONS = ["dynamic", "ops", "security", "governance", "data", "reporting", "integrations", "analytics"];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function titleToCanonical(name: string, domain: string): string {
  const slug = slugify(name || "new-cat") || "new-cat";
  return `cats/${domain || "dynamic"}/${slug}`;
}

function makeDynamicId(): string {
  return `RGPT-DYN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export default function CreateCatWizard() {
  const [step, setStep] = useState<Step>(1);

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("dynamic");
  const [canonical, setCanonical] = useState("");
  const [canonicalTouched, setCanonicalTouched] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [version, setVersion] = useState("0.1.0");

  const [status, setStatus] = useState<CatCatalogItem["status"]>("proposed");
  const [sideEffects, setSideEffects] = useState<SideEffect[]>(["read_only"]);
  const [passportMode, setPassportMode] = useState<PassportMode>("optional");
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>("optional");

  const [tagsCsv, setTagsCsv] = useState("");
  const [savedCatId, setSavedCatId] = useState<string | null>(null);

  const [catsVersion, setCatsVersion] = useState(0);

  useEffect(() => {
    if (!canonicalTouched) {
      setCanonical(titleToCanonical(name, domain));
    }
  }, [canonicalTouched, domain, name]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "rgpt.cats.dynamic.v1") {
        setCatsVersion((value) => value + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const allCats = useMemo(() => {
    void catsVersion;
    return getCatsForUi();
  }, [catsVersion]);

  const errors = useMemo(() => {
    const result: Partial<Record<"name" | "canonical" | "purpose" | "sideEffects", string>> = {};
    if (!name.trim()) result.name = "Name is required.";
    if (!canonical.trim()) {
      result.canonical = "Canonical name is required.";
    } else if (allCats.some((item) => item.canonical_name.toLowerCase() === canonical.trim().toLowerCase())) {
      result.canonical = "Canonical name must be unique.";
    }
    if (!purpose.trim()) result.purpose = "Purpose is required.";
    if (sideEffects.length === 0) result.sideEffects = "Select at least one side-effect.";
    return result;
  }, [allCats, canonical, name, purpose, sideEffects.length]);

  const parsedTags = useMemo(
    () =>
      Array.from(
        new Set(
          tagsCsv
            .split(",")
            .map((tag) => slugify(tag))
            .filter(Boolean)
            .concat(["dynamic", "development_pending"])
        )
      ),
    [tagsCsv]
  );

  const preview = useMemo<DynamicCatItem>(
    () => ({
      cat_id: "RGPT-DYN-PREVIEW",
      canonical_name: canonical.trim() || titleToCanonical(name, domain),
      name: name.trim() || "Untitled CAT",
      purpose: purpose.trim() || "",
      version: version.trim() || "0.1.0",
      status,
      owner: "user",
      requires_approval: approvalMode === "required",
      passport_required: passportMode === "required",
      allowed_side_effects: sideEffects,
      tags: parsedTags,
      last_updated: new Date().toISOString(),
      source: "dynamic",
    }),
    [approvalMode, canonical, domain, name, parsedTags, passportMode, purpose, sideEffects, status, version]
  );

  const hasErrors = Object.keys(errors).length > 0;

  function toggleSideEffect(effect: SideEffect): void {
    setSideEffects((current) => {
      if (effect === "none") {
        return current.includes("none") ? [] : ["none"];
      }
      const withoutNone = current.filter((entry) => entry !== "none");
      return withoutNone.includes(effect)
        ? withoutNone.filter((entry) => entry !== effect)
        : [...withoutNone, effect];
    });
  }

  function save(): void {
    if (hasErrors) {
      publishNotification({
        level: "error",
        title: "Validation Failed",
        message: "Please fix the highlighted fields before saving.",
      });
      return;
    }

    const newCat: DynamicCatItem = {
      ...preview,
      cat_id: makeDynamicId(),
      canonical_name: canonical.trim(),
      name: name.trim(),
      purpose: purpose.trim(),
      version: version.trim() || "0.1.0",
      last_updated: new Date().toISOString(),
    };

    const saved = saveDynamicCat(newCat);
    recordCatsUsage({
      catId: saved.cat_id,
      canonicalName: saved.canonical_name,
      action: "save_dynamic",
    });

    setSavedCatId(saved.cat_id);
    publishNotification({
      level: "success",
      title: "CAT Saved",
      message: `${saved.cat_id} saved to local library.`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStep(n as Step)}
            className={`rounded border px-2 py-1 ${step === n ? "border-sky-400 bg-sky-50" : "border-gray-300"}`}
          >
            Step {n}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <section className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Step 1: Basics</h2>
          <label className="block text-sm">
            Name *
            <input value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 w-full rounded border px-3 py-2 ${errors.name ? "border-red-400" : "border-gray-300"}`} />
            {errors.name ? <span className="text-xs text-red-600">{errors.name}</span> : null}
          </label>
          <label className="block text-sm">
            Domain
            <select value={domain} onChange={(event) => setDomain(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
              {DOMAIN_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Canonical *
            <input
              value={canonical}
              onChange={(event) => {
                setCanonicalTouched(true);
                setCanonical(event.target.value);
              }}
              className={`mt-1 w-full rounded border px-3 py-2 ${errors.canonical ? "border-red-400" : "border-gray-300"}`}
            />
            {errors.canonical ? <span className="text-xs text-red-600">{errors.canonical}</span> : null}
          </label>
          <label className="block text-sm">
            Purpose *
            <textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} className={`mt-1 w-full rounded border px-3 py-2 ${errors.purpose ? "border-red-400" : "border-gray-300"}`} />
            {errors.purpose ? <span className="text-xs text-red-600">{errors.purpose}</span> : null}
          </label>
          <label className="block text-sm">
            Version
            <input value={version} onChange={(event) => setVersion(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </label>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Step 2: Safety / Governance</h2>
          <label className="block text-sm">
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as CatCatalogItem["status"])} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
              {(["proposed", "draft", "approved", "blocked", "deprecated"] as const).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <div className="space-y-1 text-sm">
            <p>Side-effects *</p>
            <div className="flex flex-wrap gap-2">
              {(["read_only", "ledger_write", "workflow_dispatch", "none"] as SideEffect[]).map((effect) => (
                <label key={effect} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs">
                  <input type="checkbox" checked={sideEffects.includes(effect)} onChange={() => toggleSideEffect(effect)} />
                  {effect}
                </label>
              ))}
            </div>
            {errors.sideEffects ? <span className="text-xs text-red-600">{errors.sideEffects}</span> : null}
          </div>

          <label className="block text-sm">
            Passport requirement
            <select value={passportMode} onChange={(event) => setPassportMode(event.target.value as PassportMode)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
              <option value="required">Required</option>
              <option value="optional">Optional</option>
              <option value="not_required">Not required</option>
            </select>
          </label>

          <label className="block text-sm">
            Approval requirement
            <select value={approvalMode} onChange={(event) => setApprovalMode(event.target.value as ApprovalMode)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900">
              <option value="required">Required</option>
              <option value="optional">Optional</option>
              <option value="not_required">Not required</option>
            </select>
          </label>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Step 3: Tags + Preview</h2>
          <label className="block text-sm">
            Tags (comma-separated)
            <input value={tagsCsv} onChange={(event) => setTagsCsv(event.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </label>

          <pre className="max-h-[28rem] overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900">
            {JSON.stringify(preview, null, 2)}
          </pre>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black">Save to Library</button>
            <Link href="/cats/library" className="rounded border border-gray-300 px-3 py-1.5 text-sm">Go to CATS Library</Link>
          </div>

          {savedCatId ? (
            <p className="text-sm text-green-700 dark:text-green-300">Saved {savedCatId} to localStorage.</p>
          ) : null}
        </section>
      ) : null}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1) as Step)} disabled={step === 1} className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40">Back</button>
        <button type="button" onClick={() => setStep((current) => Math.min(3, current + 1) as Step)} disabled={step === 3} className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
