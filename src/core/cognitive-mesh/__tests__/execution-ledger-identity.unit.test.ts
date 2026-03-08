import { test } from "node:test";
import * as assert from "node:assert/strict";
import { ExecutionLedger } from "../runtime/execution-ledger";
import { canonicalizeExecutionLedgerEntry } from "../runtime/timeline-canonicalizer";
import { runSingleManualHeartbeat } from "../runtime/manual-heartbeat-runner";
import { HeartbeatRateLimitGuard } from "../runtime/heartbeat-kill-switch";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function createKillSwitchEnabledFile(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-ledger-id-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  await mkdir(runtimeDir, { recursive: true });
  const file = join(runtimeDir, "kill-switch.json");
  await writeFile(file, JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true }), "utf8");
  return file;
}

test("execution ledger entryId remains unique across separate ledger instances", () => {
  const firstLedger = new ExecutionLedger("", "");
  const secondLedger = new ExecutionLedger("", "");

  const first = firstLedger.append({
    category: "runtime",
    eventType: "runtime.guard.evaluated",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    ids: { executionId: "heartbeat_run_1" },
    mode: "normal",
    status: "evaluated",
    timestamp: "2026-03-08T12:00:00.000Z",
  });
  const second = secondLedger.append({
    category: "runtime",
    eventType: "runtime.guard.evaluated",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    ids: { executionId: "heartbeat_run_2" },
    mode: "normal",
    status: "evaluated",
    timestamp: "2026-03-08T12:00:00.000Z",
  });

  assert.notEqual(first.entryId, second.entryId);
});

test("manual heartbeat produces unique ledger entry ids across distinct runs", async () => {
  const killSwitchPath = await createKillSwitchEnabledFile();
  const env = { RGPT_HEARTBEAT_ENABLED: "true" };
  const guard = new HeartbeatRateLimitGuard(10_000);

  const runA = await runSingleManualHeartbeat({
    runtimeId: "hb-identity",
    killSwitchPath,
    env,
    rateLimitGuard: guard,
    ledger: new ExecutionLedger("", ""),
    now: new Date("2026-03-08T12:01:00.000Z"),
  });
  const runB = await runSingleManualHeartbeat({
    runtimeId: "hb-identity",
    killSwitchPath,
    env,
    rateLimitGuard: guard,
    ledger: new ExecutionLedger("", ""),
    now: new Date("2026-03-08T12:01:11.000Z"),
  });

  assert.equal(runA.emitted, true);
  assert.equal(runB.emitted, true);
  assert.notEqual(runA.ledgerEntryId, runB.ledgerEntryId);
});

test("timeline stableIdentity/eventId remain deterministic for equivalent canonical runtime events", () => {
  const first = canonicalizeExecutionLedgerEntry(
    {
      entryId: "exec_one",
      timestamp: "2026-03-08T12:02:00.000Z",
      category: "runtime",
      eventType: "runtime.guard.evaluated",
      action: "runtime.heartbeat.manual.single",
      source: "manual_heartbeat_runner",
      target: "system_heartbeat",
      ids: { executionId: "heartbeat_exec_equiv", requestId: "hb-req-equivalent" },
      mode: "normal",
      status: "evaluated",
      metadata: { heartbeat: true },
    },
    { sequenceNo: 1, prevEventHash: null }
  );
  const second = canonicalizeExecutionLedgerEntry(
    {
      entryId: "exec_two",
      timestamp: "2026-03-08T12:02:00.000Z",
      category: "runtime",
      eventType: "runtime.guard.evaluated",
      action: "runtime.heartbeat.manual.single",
      source: "manual_heartbeat_runner",
      target: "system_heartbeat",
      ids: { executionId: "heartbeat_exec_equiv", requestId: "hb-req-equivalent" },
      mode: "normal",
      status: "evaluated",
      metadata: { heartbeat: true },
    },
    { sequenceNo: 1, prevEventHash: null }
  );

  assert.equal(first.stableIdentity, second.stableIdentity);
  assert.equal(first.eventId, second.eventId);
  assert.equal(first.integrity.eventHash, second.integrity.eventHash);
});

