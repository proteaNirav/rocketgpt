import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHybridHeartbeatMonitor } from "../runtime/hybrid-heartbeat";
import { runSingleManualHeartbeat } from "../runtime/manual-heartbeat-runner";
import { ExecutionLedger } from "../runtime/execution-ledger";

interface Fixture {
  root: string;
  killSwitchPath: string;
  statePath: string;
  ledgerPath: string;
  timelinePath: string;
  env: NodeJS.ProcessEnv;
}

async function createFixture(heartbeatEnabled: boolean): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-d20-hybrid-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const killSwitchPath = join(runtimeDir, "kill-switch.json");
  const statePath = join(runtimeDir, "heartbeat-state.json");
  const ledgerPath = join(meshDir, "execution-ledger.jsonl");
  const timelinePath = join(meshDir, "runtime-timeline.jsonl");

  await writeFile(
    killSwitchPath,
    JSON.stringify({ heartbeat: heartbeatEnabled, runtimeSignals: true, capabilityDispatch: true }),
    "utf8"
  );
  await writeFile(ledgerPath, "", "utf8");
  await writeFile(timelinePath, "", "utf8");

  return {
    root,
    killSwitchPath,
    statePath,
    ledgerPath,
    timelinePath,
    env: {
      RGPT_HEARTBEAT_ENABLED: "true",
      RGPT_HEARTBEAT_KILL_SWITCH_PATH: killSwitchPath,
      RGPT_HEARTBEAT_STATE_PATH: statePath,
      COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: ledgerPath,
      COGNITIVE_MESH_RUNTIME_TIMELINE_JSONL_PATH: timelinePath,
    },
  };
}

async function countJsonlLines(path: string): Promise<number> {
  const text = await readFile(path, "utf8");
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;
}

async function readState(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

test("blocked heartbeat writes blocked heartbeat state but no ledger spam", async () => {
  const fixture = await createFixture(false);

  const first = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-blocked",
    now: new Date("2026-03-09T00:00:00.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const second = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-blocked",
    now: new Date("2026-03-09T00:00:10.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const state = await readState(fixture.statePath);
  assert.equal(first.report.heartbeatState, "blocked");
  assert.equal(second.report.heartbeatState, "blocked");
  assert.equal(first.report.ledgerEventWritten, true);
  assert.equal(second.report.ledgerEventWritten, false);
  assert.equal(state.currentState, "blocked");
  assert.equal(await countJsonlLines(fixture.ledgerPath), 1);
});

test("healthy repeated monitor runs do not create repeated ledger entries", async () => {
  const fixture = await createFixture(true);

  await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-healthy",
    now: new Date("2026-03-09T01:00:00.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const before = await countJsonlLines(fixture.ledgerPath);

  const second = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-healthy",
    now: new Date("2026-03-09T01:00:20.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const after = await countJsonlLines(fixture.ledgerPath);
  assert.equal(second.report.heartbeatState, "healthy");
  assert.equal(second.report.ledgerEventWritten, false);
  assert.equal(after, before);
});

test("transition from blocked to healthy causes a ledger event", async () => {
  const fixture = await createFixture(false);

  await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-transition-blocked",
    now: new Date("2026-03-09T02:00:00.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  await writeFile(
    fixture.killSwitchPath,
    JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true }),
    "utf8"
  );

  const result = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-transition-blocked",
    now: new Date("2026-03-09T02:00:20.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  assert.equal(result.report.heartbeatState, "healthy");
  assert.equal(result.report.transitionDetected, true);
  assert.equal(result.report.ledgerEventWritten, true);
  assert.equal(await countJsonlLines(fixture.ledgerPath), 2);
});

test("transition from healthy to degraded causes a ledger event", async () => {
  const fixture = await createFixture(true);

  await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-transition-degraded",
    now: new Date("2026-03-09T03:00:00.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const invalidTimelinePath = join(fixture.root, "missing", "runtime-timeline.jsonl");

  const result = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-transition-degraded",
    now: new Date("2026-03-09T03:00:15.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: invalidTimelinePath,
  });

  assert.equal(result.report.heartbeatState, "degraded");
  assert.equal(result.report.transitionDetected, true);
  assert.equal(result.report.ledgerEventWritten, true);
  assert.equal(result.report.shouldAlert, true);
  assert.equal(await countJsonlLines(fixture.ledgerPath), 1);
});

test("manual heartbeat still works and remains ledger-visible", async () => {
  const fixture = await createFixture(true);
  const ledger = new ExecutionLedger("", "");

  const result = await runSingleManualHeartbeat({
    runtimeId: "rgpt-d20-manual",
    now: new Date("2026-03-09T04:00:00.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    ledger,
    requestId: "req-d20-manual",
    sessionId: "session-d20-manual",
  });

  assert.equal(result.emitted, true);
  assert.equal(result.ledgerEntryId !== undefined, true);
  assert.equal(ledger.snapshot().length, 1);
});

test("heartbeat state file updates correctly", async () => {
  const fixture = await createFixture(true);

  const first = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-state",
    now: new Date("2026-03-09T05:00:00.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const second = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-state",
    now: new Date("2026-03-09T05:00:20.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const state = await readState(fixture.statePath);

  assert.equal(first.report.heartbeatState, "healthy");
  assert.equal(second.report.heartbeatState, "healthy");
  assert.equal(state.runtimeId, "rgpt-d20-state");
  assert.equal(state.currentState, "healthy");
  assert.equal(state.previousState, "healthy");
  assert.equal(state.transitionDetected, false);
  assert.equal(typeof state.lastEvaluatedAt, "string");
  assert.equal(typeof state.lastHealthyAt, "string");
});

test("external monitor path is read-safe for ledger/timeline and deterministic on repeated healthy runs", async () => {
  const fixture = await createFixture(true);

  await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-monitor-safe",
    now: new Date("2026-03-09T06:00:00.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const ledgerBefore = await stat(fixture.ledgerPath);
  const timelineBefore = await stat(fixture.timelinePath);

  const first = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-monitor-safe",
    now: new Date("2026-03-09T06:00:20.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const second = await runHybridHeartbeatMonitor({
    runtimeId: "rgpt-d20-monitor-safe",
    now: new Date("2026-03-09T06:00:21.000Z"),
    env: fixture.env,
    killSwitchPath: fixture.killSwitchPath,
    statePath: fixture.statePath,
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
  });

  const ledgerAfter = await stat(fixture.ledgerPath);
  const timelineAfter = await stat(fixture.timelinePath);

  assert.equal(first.report.heartbeatState, "healthy");
  assert.equal(second.report.heartbeatState, "healthy");
  assert.equal(first.report.ledgerEventWritten, false);
  assert.equal(second.report.ledgerEventWritten, false);
  assert.equal(ledgerBefore.mtimeMs, ledgerAfter.mtimeMs);
  assert.equal(timelineBefore.mtimeMs, timelineAfter.mtimeMs);
  assert.equal(first.report.shouldAlert, false);
  assert.equal(second.report.shouldAlert, false);
});

test("runtime id resolution uses supplied env over global process env", async () => {
  const fixture = await createFixture(true);
  const originalGlobalRuntimeId = process.env.RGPT_RUNTIME_ID;
  process.env.RGPT_RUNTIME_ID = "rgpt-global-runtime-id";

  try {
    const result = await runHybridHeartbeatMonitor({
      now: new Date("2026-03-09T06:30:00.000Z"),
      env: {
        ...fixture.env,
        RGPT_RUNTIME_ID: "rgpt-injected-runtime-id",
      },
      killSwitchPath: fixture.killSwitchPath,
      statePath: fixture.statePath,
      ledgerPath: fixture.ledgerPath,
      timelinePath: fixture.timelinePath,
    });

    assert.equal(result.report.runtimeId, "rgpt-injected-runtime-id");
  } finally {
    if (originalGlobalRuntimeId === undefined) {
      delete process.env.RGPT_RUNTIME_ID;
    } else {
      process.env.RGPT_RUNTIME_ID = originalGlobalRuntimeId;
    }
  }
});

test("no scheduler is introduced in hybrid heartbeat implementation", async () => {
  const hybridHeartbeatSource = await readFile(join("src", "core", "cognitive-mesh", "runtime", "hybrid-heartbeat.ts"), "utf8");
  const hybridCliSource = await readFile(join("src", "core", "cognitive-mesh", "runtime", "hybrid-heartbeat.cli.ts"), "utf8");

  assert.equal(hybridHeartbeatSource.includes("setInterval("), false);
  assert.equal(hybridHeartbeatSource.includes("setTimeout("), false);
  assert.equal(hybridCliSource.includes("setInterval("), false);
});
