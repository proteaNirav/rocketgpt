import { performance } from "node:perf_hooks";
import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectRuntimeStatus } from "../runtime/runtime-status";

async function writeJsonl(path: string, records: unknown[]): Promise<void> {
  const body = records.map((record) => JSON.stringify(record)).join("\n");
  await writeFile(path, `${body}\n`, "utf8");
}

test("benchmark: runtime status summary for 2000 ledger/timeline records stays under 500ms", async () => {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-status-bench-"));
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  await mkdir(meshDir, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });

  const ledgerPath = join(meshDir, "execution-ledger.jsonl");
  const timelinePath = join(meshDir, "runtime-timeline.jsonl");
  const killSwitchPath = join(runtimeDir, "kill-switch.json");
  await writeFile(killSwitchPath, JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true }), "utf8");

  const ledger: unknown[] = [];
  const timeline: unknown[] = [];

  for (let i = 0; i < 2000; i += 1) {
    const ts = new Date(Date.parse("2026-03-08T10:00:00.000Z") + i * 10).toISOString();
    ledger.push({
      entryId: `exec_${i}`,
      timestamp: ts,
      category: i % 3 === 0 ? "runtime" : "execution",
      eventType: i % 10 === 0 ? "execution.failed" : "execution.completed",
      action: i % 25 === 0 ? "runtime.heartbeat.manual.single" : "process_chat_user_request",
      source: "mesh_live_runtime",
      target: i % 25 === 0 ? "system_heartbeat" : "cap.language.v1",
      status: i % 10 === 0 ? "failed" : "completed",
    });

    timeline.push({
      schemaVersion: "rgpt.timeline_event.canonical.v1",
      executionId: "exec-bench",
      eventId: `tle_${i}`,
      stableIdentity: `sid_${i}`,
      sequenceNo: i + 1,
      timestamp: ts,
      eventType: i % 11 === 0 ? "EXECUTION_DENIED" : "EXECUTION_COMPLETED",
      category: "execution",
      layer: 6,
      stage: i % 11 === 0 ? "execution_denied" : "execution_completed",
      action: "process_chat_user_request",
      source: "mesh_live_runtime",
      target: "cap.language.v1",
      actorType: "system",
      mode: "normal",
      status: i % 11 === 0 ? "blocked" : "ok",
      outcome: i % 11 === 0 ? "denied" : "completed",
      correlation: { executionId: "exec-bench" },
      authority: { authContextHash: "abc", policyProfile: "bench" },
      integrity: { eventHash: `hash_${i}`, prevEventHash: i === 0 ? null : `hash_${i - 1}` },
    });
  }

  await writeJsonl(ledgerPath, ledger);
  await writeJsonl(timelinePath, timeline);

  const t0 = performance.now();
  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:05:00.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath,
    timelinePath,
    killSwitchPath,
  });
  const elapsedMs = performance.now() - t0;

  assert.equal(report.ledger.entryCount, 2000);
  assert.equal(report.timeline.eventCount, 2000);
  assert.ok(elapsedMs < 500, `runtime status elapsed ${elapsedMs.toFixed(2)}ms exceeds 500ms`);
});
