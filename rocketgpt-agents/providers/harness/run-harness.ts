// rocketgpt-agents/providers/harness/run-harness.ts

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { performance } from "node:perf_hooks";

import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import type {
  HarnessInvokeResult,
  HarnessPromptPayload,
  ProviderAdapter,
} from "./providerAdapter.types";

// ------------------------------
// Types (config schema)
// ------------------------------
type HarnessConfig = {
  runMode: "OFFLINE" | "SAFE" | "SUPERVISED" | "AUTONOMOUS";
  defaults: {
    max_tokens: number;
    temperature: number;
    latency_ms: number;
    token_budget: number;
  };
  providers: Array<{ name: string; enabled: boolean }>;
  tests: Array<{
    id: string;
    fixture: string; // relative to this directory
    expect: { min_length: number; schema: "plain_text" };
  }>;
};

type EvidenceRow = {
  run_id: string;
  sha: string;
  timestamp_utc: string;

  provider: string;
  model: string;
  test_id: string;

  status: "PASS" | "FAIL";
  fail_code?: string;
  fail_detail?: string;

  tokens_in: number;
  tokens_out: number;
  latency_ms: number;

  // stable fingerprint of prompt+output (useful for drift checks)
  io_hash: string;
};

// ------------------------------
// Helpers
// ------------------------------
function utcNowIso(): string {
  return new Date().toISOString();
}

function safeReadJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

// Best-effort git SHA (CI should provide this via env)
function getSha(): string {
  const envSha =
    process.env.GITHUB_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CI_COMMIT_SHA;
  return (envSha && envSha.trim()) || "UNKNOWN";
}

// ------------------------------
// Assertions (deterministic)
// ------------------------------
function assertPlainText(text: string): string | null {
  // No markdown code fences. Keep this strict.
  if (text.includes("```")) return "SCHEMA_MISMATCH";
  return null;
}

function classifyProviderError(err: unknown): { code: string; detail: string } {
  const msg =
    err instanceof Error ? `${err.name}: ${err.message}` : String(err);

  const m = msg.toLowerCase();

  if (m.includes("unauthorized") || m.includes("invalid api key") || m.includes("401"))
    return { code: "AUTH_FAIL", detail: msg };

  if (m.includes("model") && (m.includes("not found") || m.includes("unknown")))
    return { code: "MODEL_NOT_FOUND", detail: msg };

  if (m.includes("timeout") || m.includes("timed out"))
    return { code: "TIMEOUT", detail: msg };

  return { code: "PROVIDER_ERROR", detail: msg };
}

// ------------------------------
// Adapter registry (wire real adapters in Step 4+)
// ------------------------------
async function loadAdapters(): Promise<ProviderAdapter[]> {
  // For now, we only load adapters that exist.
  // Step 4 will add OpenAI adapter; Step 5 will add Claude; Step 6 Gemini.
  const adapters: ProviderAdapter[] = [];

  const tryLoad = async (rel: string) => {
    // Resolve both extensionless and .ts paths (Windows + ESM-friendly)
    const fullNoExt = path.join(__dirname, rel);
    const fullTs = fullNoExt.endsWith(".ts") ? fullNoExt : (fullNoExt + ".ts");
    const fullJs = fullNoExt.endsWith(".js") ? fullNoExt : (fullNoExt + ".js");

    const candidate =
      (fs.existsSync(fullNoExt) && fullNoExt) ||
      (fs.existsSync(fullTs) && fullTs) ||
      (fs.existsSync(fullJs) && fullJs);

    if (!candidate) return;

    const mod = await import(pathToFileURL(candidate).href);
    if (mod?.default) adapters.push(mod.default as ProviderAdapter);
  };

  await tryLoad("../adapters/openai.adapter");
  await tryLoad("../adapters/claude.adapter");
  await tryLoad("../adapters/gemini.adapter");

  return adapters;
}

// ------------------------------
// Main
// ------------------------------
async function main() {
  const rootDir = __dirname;
  const cfgPath = path.join(rootDir, "harness.config.json");
  const cfg = safeReadJson<HarnessConfig>(cfgPath);

  const runId =
    process.env.RGPT_RUN_ID ||
    `RGPT-S19-P3-${utcNowIso().replace(/[:.]/g, "").replace("Z", "Z")}`;

  const sha = getSha();
  const evidenceDir = path.join(rootDir, "evidence");
  const evidencePath = path.join(
    evidenceDir,
    `provider-harness.${runId}.jsonl`
  );

  fs.mkdirSync(evidenceDir, { recursive: true });

  const allAdapters = await loadAdapters();
  const enabledProviders = new Set(
    cfg.providers.filter((p) => p.enabled).map((p) => p.name)
  );
  const adapters = allAdapters.filter((a) => enabledProviders.has(a.name));

  if (adapters.length === 0) {
    console.error(
      "No enabled adapters found. Add adapters under rocketgpt-agents/providers/adapters/."
    );
    process.exit(2);
  }

  console.log(`RunId: ${runId}`);
  console.log(`SHA:   ${sha}`);
  console.log(`Mode:  ${cfg.runMode}`);
  console.log(
    `Providers: ${adapters.map((a) => `${a.name}(${a.model})`).join(", ")}`
  );
  console.log(`Tests: ${cfg.tests.map((t) => t.id).join(", ")}`);
  console.log(`Evidence: ${evidencePath}`);

  let failCount = 0;

  for (const adapter of adapters) {
    for (const t of cfg.tests) {
      const fixturePath = path.join(rootDir, t.fixture);
      const fixture = safeReadJson<{ system?: string; user: string }>(
        fixturePath
      );

      const input: HarnessPromptPayload = {
        id: t.id,
        system: fixture.system,
        user: fixture.user,
        max_tokens: cfg.defaults.max_tokens,
        temperature: cfg.defaults.temperature,
      };

      let status: EvidenceRow["status"] = "PASS";
      let fail_code: string | undefined;
      let fail_detail: string | undefined;

      let result: HarnessInvokeResult | null = null;

      const start = performance.now();
      try {
        result = await adapter.invoke(input);
      } catch (e) {
        const c = classifyProviderError(e);
        status = "FAIL";
        fail_code = c.code;
        fail_detail = c.detail;
        failCount++;
      }
      const end = performance.now();

      // If adapter didn't report latency, we compute it.
      const measuredLatency = Math.max(0, Math.round(end - start));
      const latency_ms =
        result?.latency_ms && result.latency_ms > 0
          ? result.latency_ms
          : measuredLatency;

      // Assertions only if we have a response
      if (status === "PASS" && result) {
        const text = (result.text || "").trim();

        if (text.length < t.expect.min_length) {
          status = "FAIL";
          fail_code = "MIN_LENGTH_FAIL";
          fail_detail = `Expected >= ${t.expect.min_length} chars, got ${text.length}`;
          failCount++;
        } else if (t.expect.schema === "plain_text") {
          const schemaErr = assertPlainText(text);
          if (schemaErr) {
            status = "FAIL";
            fail_code = schemaErr;
            fail_detail = "Output contains disallowed formatting (e.g., code fences).";
            failCount++;
          }
        }

        // Budgets
        const totalTokens = (result.tokens_in || 0) + (result.tokens_out || 0);
        if (status === "PASS" && totalTokens > cfg.defaults.token_budget) {
          status = "FAIL";
          fail_code = "TOKEN_BUDGET_EXCEEDED";
          fail_detail = `Budget ${cfg.defaults.token_budget}, got ${totalTokens}`;
          failCount++;
        }

        if (status === "PASS" && latency_ms > cfg.defaults.latency_ms) {
          status = "FAIL";
          fail_code = "LATENCY_EXCEEDED";
          fail_detail = `Limit ${cfg.defaults.latency_ms}ms, got ${latency_ms}ms`;
          failCount++;
        }
      }

      // Evidence row
      const io_hash = sha256(
        JSON.stringify({
          provider: adapter.name,
          model: adapter.model,
          test: t.id,
          input,
          output: result?.text || "",
        })
      );

      const row: EvidenceRow = {
        run_id: runId,
        sha,
        timestamp_utc: utcNowIso(),

        provider: adapter.name,
        model: adapter.model,
        test_id: t.id,

        status,
        fail_code,
        fail_detail,

        tokens_in: result?.tokens_in || 0,
        tokens_out: result?.tokens_out || 0,
        latency_ms,

        io_hash,
      };

      fs.appendFileSync(evidencePath, JSON.stringify(row) + "\n", "utf8");

      console.log(
        `[${row.status}] ${row.provider}:${row.model} :: ${row.test_id} :: tokens=${row.tokens_in +
          row.tokens_out
        } latency=${row.latency_ms}ms`
      );

      // Optional: show fail detail in console
      if (row.status === "FAIL") {
        console.log(`  -> ${row.fail_code}: ${row.fail_detail}`);
      }
    }
  }

  if (failCount > 0) {
    console.error(`Harness completed with ${failCount} failures.`);
    process.exit(1);
  }

  console.log("Harness completed successfully.");
}

main().catch((e) => {
  console.error("Harness fatal error:", e);
  process.exit(2);
});



