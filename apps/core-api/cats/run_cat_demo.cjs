const fs = require("node:fs");
const path = require("node:path");

function repoRootFromHere() {
  // apps/core-api/cats -> repo root
  return path.resolve(__dirname, "..", "..", "..");
}

function loadCats(root) {
  const defsDir = path.join(root, "cats", "definitions");
  if (!fs.existsSync(defsDir)) return [];
  return fs.readdirSync(defsDir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(defsDir, f), "utf8")));
}

function main() {
  const catId = process.argv[2];
  if (!catId) {
    console.error("Usage: node run_cat_demo.cjs <RGPT-CAT-XX> [jsonInput]");
    process.exit(2);
  }

  const jsonArg = process.argv[3];
  const input = jsonArg ? JSON.parse(jsonArg) : { demo: true, ts: new Date().toISOString() };

  const root = repoRootFromHere();
  const cats = loadCats(root);
  const def = cats.find((c) => c.cat_id === catId);

  if (!def) {
    console.error(`CAT not found: ${catId}`);
    process.exit(3);
  }

  // Demo-safe scaffold output (Step 6 will wire into actual core-api execution + ledger)
  const output = {
    ok: true,
    cat_id: def.cat_id,
    name: def.name,
    entrypoint: def.entrypoint,
    runtime_mode: def.runtime_mode,
    requires_approval: def.requires_approval,
    allowed_side_effects: def.allowed_side_effects,
    input,
    note: "CJS demo runner executed without TS/ESM runtime. Step-6 will connect to real execution + ledger envelope."
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
