import fs from "node:fs";
import path from "node:path";

export type CatDefinition = {
  cat_id: string;
  name: string;
  description?: string;
  owner: "system" | "user";
  type: "governance" | "ops" | "analysis" | "demo";
  version: string;
  entrypoint: string; // repo-relative
  runtime_mode: "strict" | "standard" | "demo";
  requires_approval: boolean;
  allowed_side_effects: Array<"none" | "ledger_write" | "read_only" | "workflow_dispatch">;
  inputs_schema?: Record<string, unknown>;
  tags?: string[];
};

export function loadCatDefinitions(repoRoot: string): CatDefinition[] {
  const defsDir = path.join(repoRoot, "cats", "definitions");
  if (!fs.existsSync(defsDir)) return [];

  const files = fs.readdirSync(defsDir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort();

  const cats: CatDefinition[] = [];
  for (const f of files) {
    const p = path.join(defsDir, f);
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw) as CatDefinition;
    cats.push(parsed);
  }
  return cats;
}

export function getCatById(repoRoot: string, catId: string): CatDefinition | undefined {
  return loadCatDefinitions(repoRoot).find((c) => c.cat_id === catId);
}
