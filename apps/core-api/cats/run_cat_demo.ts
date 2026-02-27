import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getCatById } from "./cat_loader";

type RunnerModule = { run: (input: unknown) => Promise<unknown> | unknown };

function repoRootFromHere(): string {
  // apps/core-api/cats -> repo root
  const __filename = fileURLToPath(import.meta.url);
  const here = path.dirname(__filename);
  return path.resolve(here, "..", "..", "..");
}

async function main() {
  const catId = process.argv[2];
  if (!catId) {
    console.error("Usage: node run_cat_demo.ts <RGPT-CAT-XX> [jsonInput]");
    process.exit(2);
  }

  const jsonArg = process.argv[3];
  const input = jsonArg ? JSON.parse(jsonArg) : { demo: true, ts: new Date().toISOString() };

  const root = repoRootFromHere();
  const def = getCatById(root, catId);
  if (!def) {
    console.error(`CAT not found: ${catId}`);
    process.exit(3);
  }

  const entryAbs = path.join(root, def.entrypoint);
  const entryUrl = pathToFileURL(entryAbs).toString();
  const mod = (await import(entryUrl)) as unknown as RunnerModule;

  if (!mod || typeof mod.run !== "function") {
    console.error(`Entrypoint missing export 'run': ${def.entrypoint}`);
    process.exit(4);
  }

  const out = await mod.run(input);
  // In Step 4 we will route this into the ledger + replay envelope.
  console.log(JSON.stringify({ cat: def.cat_id, name: def.name, output: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
