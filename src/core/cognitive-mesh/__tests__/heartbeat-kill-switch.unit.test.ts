import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ExecutionLedger } from "../runtime/execution-ledger";
import {
  HeartbeatRateLimitGuard,
  canRunHeartbeat,
  readHeartbeatRuntimeKillSwitch,
} from "../runtime/heartbeat-kill-switch";
import { runSingleManualHeartbeat } from "../runtime/manual-heartbeat-runner";

async function createKillSwitchFile(content: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-heartbeat-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  await mkdir(runtimeDir, { recursive: true });
  const file = join(runtimeDir, "kill-switch.json");
  await writeFile(file, content, "utf8");
  return file;
}

test("env disabled blocks heartbeat", async () => {
  const file = await createKillSwitchFile(
    JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true })
  );
  const decision = await canRunHeartbeat({
    runtimeId: "hb-env-disabled",
    env: {},
    killSwitchPath: file,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reasonCodes.includes("ENV_DISABLED"), true);
});

test("env enabled + file disabled blocks heartbeat", async () => {
  const file = await createKillSwitchFile(
    JSON.stringify({ heartbeat: false, runtimeSignals: true, capabilityDispatch: true })
  );
  const decision = await canRunHeartbeat({
    runtimeId: "hb-file-disabled",
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    killSwitchPath: file,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reasonCodes.includes("FILE_DISABLED"), true);
});

test("env enabled + file enabled + guard pass allows heartbeat", async () => {
  const file = await createKillSwitchFile(
    JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true })
  );
  const decision = await canRunHeartbeat({
    runtimeId: "hb-allowed",
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    killSwitchPath: file,
    rateLimitGuard: new HeartbeatRateLimitGuard(10_000),
  });
  assert.equal(decision.allowed, true);
  assert.deepEqual(decision.reasonCodes, ["HEARTBEAT_ALLOWED"]);
});

test("missing file is fail-safe and blocks heartbeat", async () => {
  const missingPath = join(tmpdir(), `rgpt-heartbeat-missing-${Date.now()}.json`);
  const decision = await canRunHeartbeat({
    runtimeId: "hb-file-missing",
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    killSwitchPath: missingPath,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reasonCodes.includes("FILE_MISSING_FAIL_SAFE"), true);
});

test("malformed file is fail-safe and blocks heartbeat", async () => {
  const file = await createKillSwitchFile("{\"heartbeat\": ");
  const decision = await canRunHeartbeat({
    runtimeId: "hb-file-malformed",
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    killSwitchPath: file,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.reasonCodes.includes("FILE_INVALID_FAIL_SAFE"), true);
});

test("rate limit exceeded blocks heartbeat", async () => {
  const file = await createKillSwitchFile(
    JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true })
  );
  const guard = new HeartbeatRateLimitGuard(10_000);
  const env = { RGPT_HEARTBEAT_ENABLED: "true" };
  const first = await canRunHeartbeat({
    runtimeId: "hb-rate-limit",
    env,
    killSwitchPath: file,
    rateLimitGuard: guard,
    now: new Date("2026-03-08T10:00:00.000Z"),
  });
  const second = await canRunHeartbeat({
    runtimeId: "hb-rate-limit",
    env,
    killSwitchPath: file,
    rateLimitGuard: guard,
    now: new Date("2026-03-08T10:00:05.000Z"),
  });
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
  assert.equal(second.reasonCodes.includes("RATE_LIMIT_EXCEEDED"), true);
});

test("successful single heartbeat emits exactly one signal and one ledger write attempt", async () => {
  const file = await createKillSwitchFile(
    JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true })
  );
  const ledger = new ExecutionLedger("", "");
  const result = await runSingleManualHeartbeat({
    runtimeId: "hb-success-single",
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    killSwitchPath: file,
    rateLimitGuard: new HeartbeatRateLimitGuard(10_000),
    ledger,
    requestId: "hb-req-1",
    sessionId: "hb-session-1",
    now: new Date("2026-03-08T11:00:00.000Z"),
  });
  assert.equal(result.emitted, true);
  assert.equal(result.runtimeSignal?.signalType, "system_heartbeat");
  const entries = ledger.snapshot();
  assert.equal(entries.length, 1);
});

test("manual heartbeat path does not trigger capability or workflow dispatch actions", async () => {
  const file = await createKillSwitchFile(
    JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true })
  );
  const ledger = new ExecutionLedger("", "");
  await runSingleManualHeartbeat({
    runtimeId: "hb-no-dispatch",
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    killSwitchPath: file,
    ledger,
  });
  const entries = ledger.snapshot();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.action, "runtime.heartbeat.manual.single");
  assert.equal(entries[0]?.target, "system_heartbeat");
  assert.equal(entries.some((entry) => entry.eventType === "dispatch.started"), false);
  assert.equal(entries.some((entry) => entry.eventType === "execution.started"), false);
});

test("kill-switch parser preserves loaded state and defaults", async () => {
  const file = await createKillSwitchFile(JSON.stringify({ heartbeat: true }));
  const result = await readHeartbeatRuntimeKillSwitch(file);
  assert.equal(result.fileState, "loaded");
  assert.equal(result.config.heartbeat, true);
  assert.equal(result.config.runtimeSignals, true);
  assert.equal(result.config.capabilityDispatch, true);
});
