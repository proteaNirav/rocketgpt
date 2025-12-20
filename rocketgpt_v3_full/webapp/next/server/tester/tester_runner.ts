import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { TesterRunInput, TesterRunOutput, TesterArtifact } from "./types";

/**
 * Generic test runner for RocketGPT Tester.
 *
 * Supports both:
 *   - ESM named export:   export async function run(ctx) { ... }
 *   - CJS default export: module.exports = { run: async function(ctx) { ... } }
 *
 * Uses webpackIgnore so that dynamic imports of local test files
 * are handled by Node at runtime (and not bundled by Webpack).
 */

export async function runTests(input: TesterRunInput): Promise<TesterRunOutput> {
  const start = Date.now();

  const logs: string[] = [];
  const artifacts: TesterArtifact[] = [];

  let testsPassed = 0;
  let testsFailed = 0;

  logs.push(
    `[Tester] Starting test run: runId=${input.runId}, buildId=${input.buildId}, mode=${input.mode}`
  );

  const projectRoot = process.cwd();
  const testsRoot = path.join(projectRoot, "tests");

  logs.push(`[Tester] Tests root resolved to: ${testsRoot}`);

  for (const testFile of input.testFiles) {
    const absPath = path.join(testsRoot, testFile);
    logs.push(`[Tester] Preparing to execute test file: ${testFile}`);
    logs.push(`[Tester] Absolute path: ${absPath}`);

    if (!fs.existsSync(absPath)) {
      logs.push(`[Tester] ❌ Test file not found: ${absPath}`);
      testsFailed += 1;
      continue;
    }

    try {
      const fileUrl = pathToFileURL(absPath).href;
      logs.push(`[Tester] Importing module from: ${fileUrl}`);

      // IMPORTANT: let Node handle file:// import at runtime
      const mod: any = await import(/* webpackIgnore: true */ fileUrl);

      // Support both ESM and CJS
      const candidateRun =
        typeof mod?.run === "function"
          ? mod.run
          : typeof mod?.default?.run === "function"
          ? mod.default.run
          : null;

      if (candidateRun) {
        logs.push(`[Tester] Running run() for: ${testFile}`);

        const result = await candidateRun({
          mode: input.mode,
          metadata: input.metadata ?? {},
        });

        const passed = typeof result?.passed === "number" ? result.passed : 1;
        const failed = typeof result?.failed === "number" ? result.failed : 0;

        testsPassed += passed;
        testsFailed += failed;

        if (Array.isArray(result?.logs)) {
          logs.push(...result.logs);
        }

        if (Array.isArray(result?.artifacts)) {
          for (const art of result.artifacts) {
            if (art && typeof art.type === "string" && typeof art.path === "string") {
              artifacts.push(art);
            }
          }
        }

        logs.push(
          `[Tester] ✅ Completed run() for ${testFile}: passed=${passed}, failed=${failed}`
        );
      } else {
        logs.push(
          `[Tester] No run() export found (ESM or CJS) in ${testFile}. Marking as passed by convention.`
        );
        testsPassed += 1;
      }
    } catch (err: any) {
      logs.push(
        `[Tester] ❌ Error executing test file ${testFile}: ${err?.message || String(err)}`
      );
      if (err?.stack) {
        logs.push(err.stack);
      }
      testsFailed += 1;
    }
  }

  const durationMs = Date.now() - start;
  const status: "success" | "failed" = testsFailed > 0 ? "failed" : "success";

  logs.push(
    `[Tester] Test run completed: status=${status}, passed=${testsPassed}, failed=${testsFailed}, duration_ms=${durationMs}`
  );

  const output: TesterRunOutput = {
    testRunId: input.runId,
    summary: {
      status,
      tests_passed: testsPassed,
      tests_failed: testsFailed,
      duration_ms: durationMs,
    },
    logs,
    artifacts,
  };

  return output;
}
