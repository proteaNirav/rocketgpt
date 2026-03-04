import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "../../..");
export const docsRoot = path.join(repoRoot, "docs", "self_improve");
export const proposalsDir = path.join(docsRoot, "proposals");
export const evidenceDir = path.join(docsRoot, "evidence");
export const findingsDir = path.join(docsRoot, "findings");
export const ledgersDir = path.join(docsRoot, "ledgers");
export const proposalSchemaPath = path.join(docsRoot, "self_improve_proposal.schema.json");
export const decisionLedgerPath = path.join(ledgersDir, "decision_ledger.jsonl");
export const executionLedgerPath = path.join(ledgersDir, "execution_ledger.jsonl");

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  const d = new Date();
  const utc = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate()
  ).padStart(2, "0")}-${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(
    2,
    "0"
  )}${String(d.getUTCSeconds()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${utc}-${rand}`;
}

export async function ensureSelfImproveDirs() {
  await Promise.all([
    fs.mkdir(docsRoot, { recursive: true }),
    fs.mkdir(proposalsDir, { recursive: true }),
    fs.mkdir(evidenceDir, { recursive: true }),
    fs.mkdir(findingsDir, { recursive: true }),
    fs.mkdir(ledgersDir, { recursive: true }),
  ]);
}

export async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function appendJsonl(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function walkFiles(rootDir) {
  const out = [];
  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else {
        out.push(abs);
      }
    }
  }
  await walk(rootDir);
  return out;
}

export function relToRepo(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}
