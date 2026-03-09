import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureRuntimeHeartbeatObservationSnapshot } from "../runtime/observation/runtime-heartbeat-snapshot-capture";

test("benchmark: repeated snapshot capture remains bounded", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-hb-observe-bench-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const observationsDir = join(runtimeDir, "observations");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(observationsDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  await writeFile(join(runtimeDir, "heartbeat-state.json"), JSON.stringify({ currentState: "healthy" }), "utf8");
  await writeFile(join(runtimeDir, "repair-state.json"), JSON.stringify({ status: "idle" }), "utf8");
  await writeFile(join(meshDir, "execution-ledger.jsonl"), "", "utf8");

  const t0 = performance.now();
  for (let i = 0; i < 30; i += 1) {
    await captureRuntimeHeartbeatObservationSnapshot({
      config: {
        enabled: true,
        durationMs: 1000,
        snapshotIntervalMs: 1000,
        outputDir: observationsDir,
        smokeMode: true,
        includeMemorySamples: true,
        runtimeId: "rgpt-bench",
        ledgerPath: join(meshDir, "execution-ledger.jsonl"),
      },
      sessionStart: new Date("2026-03-09T20:00:00.000Z"),
      now: new Date("2026-03-09T20:00:01.000Z"),
      sessionDirectory: observationsDir,
      runtimeRootDir: runtimeDir,
      includeMemorySamples: true,
      cpuSampleStart: process.cpuUsage(),
      captureStartedAtMs: performance.now(),
    });
  }
  const elapsed = performance.now() - t0;

  assert.ok(elapsed < 2500, `snapshot capture benchmark ${elapsed.toFixed(2)}ms exceeds 2500ms`);
});
