import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runHybridHeartbeatMonitor } from "../runtime/hybrid-heartbeat";

test("benchmark: hybrid heartbeat monitor hot-path for 20 healthy checks stays under 1500ms", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-d20-hybrid-bench-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");

  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const killSwitchPath = join(runtimeDir, "kill-switch.json");
  const statePath = join(runtimeDir, "heartbeat-state.json");
  const ledgerPath = join(meshDir, "execution-ledger.jsonl");
  const timelinePath = join(meshDir, "runtime-timeline.jsonl");

  await writeFile(killSwitchPath, JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true }), "utf8");
  await writeFile(ledgerPath, "", "utf8");
  await writeFile(timelinePath, "", "utf8");

  const env: NodeJS.ProcessEnv = {
    RGPT_HEARTBEAT_ENABLED: "true",
    RGPT_HEARTBEAT_KILL_SWITCH_PATH: killSwitchPath,
    RGPT_HEARTBEAT_STATE_PATH: statePath,
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: ledgerPath,
    COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH: timelinePath,
  };

  await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-bench",
    now: new Date("2026-03-09T07:00:00.000Z"),
    env,
    killSwitchPath,
    statePath,
    ledgerPath,
    timelinePath,
  });

  const t0 = performance.now();
  for (let i = 1; i <= 20; i += 1) {
    await runHybridHeartbeatMonitor({
      runtimeId: "rgpt-d20-bench",
      now: new Date(Date.parse("2026-03-09T07:00:00.000Z") + i * 1000),
      env,
      killSwitchPath,
      statePath,
      ledgerPath,
      timelinePath,
    });
  }
  const elapsedMs = performance.now() - t0;

  assert.ok(elapsedMs < 1500, `hybrid heartbeat hot-path elapsed ${elapsedMs.toFixed(2)}ms exceeds 1500ms`);
});
