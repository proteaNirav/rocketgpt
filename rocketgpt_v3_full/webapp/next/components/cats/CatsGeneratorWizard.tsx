"use client";

import { useEffect, useMemo, useState } from "react";

type SideEffect = "none" | "ledger_write" | "read_only" | "workflow_dispatch";
type CatType = "governance" | "ops" | "analysis" | "demo";
type RuntimeMode = "strict" | "standard" | "demo";
type CatOwner = "system" | "user";

const SIDE_EFFECTS: SideEffect[] = ["none", "ledger_write", "read_only", "workflow_dispatch"];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function defaultPassportId(catId: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${catId}-PASS-${y}${m}${d}`;
}

function downloadJson(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

export default function CatsGeneratorWizard() {
  const [catId, setCatId] = useState("RGPT-CAT-99");
  const [name, setName] = useState("Custom Demo CAT");
  const [description, setDescription] = useState("Generated CAT for demo-safe replay workflows.");
  const [publisherNamespace, setPublisherNamespace] = useState("demo");
  const [canonicalSuffix, setCanonicalSuffix] = useState("custom-cat");
  const [type, setType] = useState<CatType>("demo");
  const [version, setVersion] = useState("0.1.0");
  const [entrypoint, setEntrypoint] = useState("apps/core-api/cats/cat_custom.ts");
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>("demo");
  const [owner, setOwner] = useState<CatOwner>("user");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [passportRequired, setPassportRequired] = useState(true);
  const [passportId, setPassportId] = useState(defaultPassportId("RGPT-CAT-99"));
  const [tagsCsv, setTagsCsv] = useState("demo,generated,cats");
  const [selectedEffects, setSelectedEffects] = useState<SideEffect[]>(["read_only"]);
  const [digest, setDigest] = useState<string>("");

  useEffect(() => {
    setPassportId((current) => (current ? current : defaultPassportId(catId)));
  }, [catId]);

  const canonicalName = useMemo(() => {
    const ns = slugify(publisherNamespace || "demo");
    const suffix = slugify(canonicalSuffix || "cat");
    return `${ns}/${suffix}`;
  }, [publisherNamespace, canonicalSuffix]);

  const tags = useMemo(
    () =>
      tagsCsv
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean),
    [tagsCsv]
  );

  const validationError = useMemo(() => {
    if (!catId.trim()) return "cat_id is required.";
    if (!name.trim()) return "name is required.";
    if (!canonicalName.trim() || !canonicalName.includes("/")) return "canonical_name must be namespace/name.";
    if (!entrypoint.trim()) return "entrypoint is required.";
    if (selectedEffects.length === 0) return "allowed_side_effects must include at least one explicit value.";
    return null;
  }, [canonicalName, catId, entrypoint, name, selectedEffects.length]);

  const definition = useMemo(
    () => ({
      runtime_mode: runtimeMode,
      description: description.trim(),
      version: version.trim(),
      cat_id: catId.trim(),
      publisher_namespace: slugify(publisherNamespace || "demo"),
      canonical_name: canonicalName,
      passport_required: passportRequired,
      passport_id: passportId.trim() || defaultPassportId(catId.trim()),
      tags,
      entrypoint: entrypoint.trim(),
      name: name.trim(),
      requires_approval: requiresApproval,
      owner,
      allowed_side_effects: selectedEffects,
      type,
    }),
    [
      runtimeMode,
      description,
      version,
      catId,
      publisherNamespace,
      canonicalName,
      passportRequired,
      passportId,
      tags,
      entrypoint,
      name,
      requiresApproval,
      owner,
      selectedEffects,
      type,
    ]
  );

  const jsonOutput = useMemo(() => `${JSON.stringify(definition, null, 2)}\n`, [definition]);

  useEffect(() => {
    let ignore = false;
    void sha256Hex(jsonOutput).then((nextDigest) => {
      if (!ignore) setDigest(nextDigest);
    });
    return () => {
      ignore = true;
    };
  }, [jsonOutput]);

  function toggleEffect(effect: SideEffect) {
    setSelectedEffects((current) =>
      current.includes(effect) ? current.filter((item) => item !== effect) : [...current, effect]
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">1. Identity</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">cat_id</div>
            <input value={catId} onChange={(e) => setCatId(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">description</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="h-20 w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">publisher_namespace</div>
            <input value={publisherNamespace} onChange={(e) => setPublisherNamespace(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">canonical suffix</div>
            <input value={canonicalSuffix} onChange={(e) => setCanonicalSuffix(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
        </div>
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
          canonical_name preview: <code>{canonicalName}</code>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">2. Governance Defaults</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">type</div>
            <select value={type} onChange={(e) => setType(e.target.value as CatType)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
              <option value="governance">governance</option>
              <option value="ops">ops</option>
              <option value="analysis">analysis</option>
              <option value="demo">demo</option>
            </select>
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">owner</div>
            <select value={owner} onChange={(e) => setOwner(e.target.value as CatOwner)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
              <option value="user">user</option>
              <option value="system">system</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
            requires_approval (default true)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={passportRequired} onChange={(e) => setPassportRequired(e.target.checked)} />
            passport_required (default true)
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">passport_id</div>
            <input value={passportId} onChange={(e) => setPassportId(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">allowed_side_effects (explicit, required)</div>
            <div className="flex flex-wrap gap-2">
              {SIDE_EFFECTS.map((effect) => (
                <label key={effect} className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700">
                  <input
                    type="checkbox"
                    checked={selectedEffects.includes(effect)}
                    onChange={() => toggleEffect(effect)}
                  />
                  {effect}
                </label>
              ))}
            </div>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">3. Runtime & Output</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">version</div>
            <input value={version} onChange={(e) => setVersion(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">runtime_mode</div>
            <select value={runtimeMode} onChange={(e) => setRuntimeMode(e.target.value as RuntimeMode)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
              <option value="demo">demo</option>
              <option value="standard">standard</option>
              <option value="strict">strict</option>
            </select>
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">entrypoint</div>
            <input value={entrypoint} onChange={(e) => setEntrypoint(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">tags (comma separated)</div>
            <input value={tagsCsv} onChange={(e) => setTagsCsv(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900" />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          {validationError ? (
            <div className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
              {validationError}
            </div>
          ) : null}

          <div className="rounded border border-gray-200 bg-gray-50 p-2 text-xs dark:border-neutral-700 dark:bg-neutral-950/40">
            bundle digest (sha256 over downloadable JSON bytes): <code>{digest || "computing..."}</code>
          </div>
          <button
            onClick={() => downloadJson(`${catId || "generated-cat"}.json`, jsonOutput)}
            disabled={Boolean(validationError)}
            className="rounded bg-black px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
          >
            Download CAT JSON
          </button>
          <pre className="overflow-x-auto rounded border border-gray-200 p-2 text-[11px] leading-5 dark:border-neutral-700">
            {jsonOutput}
          </pre>
        </div>
      </div>
    </div>
  );
}
