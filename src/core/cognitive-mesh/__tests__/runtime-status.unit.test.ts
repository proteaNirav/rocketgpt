import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, stat, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { collectRuntimeStatus } from "../runtime/runtime-status";

interface FixturePaths {
  root: string;
  ledgerPath: string;
  timelinePath: string;
  killSwitchPath: string;
}

async function createFixtureRoot(): Promise<FixturePaths> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-status-"));
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  await mkdir(meshDir, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });
  return {
    root,
    ledgerPath: join(meshDir, "execution-ledger.jsonl"),
    timelinePath: join(meshDir, "runtime-timeline.jsonl"),
    killSwitchPath: join(runtimeDir, "kill-switch.json"),
  };
}

async function writeJsonl(path: string, records: unknown[]): Promise<void> {
  const body = records.map((record) => JSON.stringify(record)).join("\n");
  await writeFile(path, body.length > 0 ? `${body}\n` : "", "utf8");
}

async function writeKillSwitch(path: string, heartbeat: boolean): Promise<void> {
  await writeFile(
    path,
    JSON.stringify({ heartbeat, runtimeSignals: true, capabilityDispatch: true }),
    "utf8"
  );
}

function baseLedgerRecord(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    entryId: "exec_1",
    timestamp: "2026-03-08T10:00:00.000Z",
    category: "runtime",
    eventType: "runtime.guard.evaluated",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    status: "evaluated",
    metadata: {
      heartbeat: {
        runtime_id: "rgpt-local-test",
      },
    },
    ...overrides,
  };
}

function baseTimelineRecord(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    schemaVersion: "rgpt.timeline_event.canonical.v1",
    executionId: "heartbeat_rgpt-local-test_1",
    eventId: "tle_1",
    stableIdentity: "sid_1",
    sequenceNo: 1,
    timestamp: "2026-03-08T10:00:00.000Z",
    eventType: "RUNTIME_GUARD_TRIGGERED",
    category: "runtime",
    layer: 5,
    stage: "runtime_evaluated",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    actorType: "guard",
    mode: "normal",
    status: "ok",
    outcome: "evaluated",
    correlation: { executionId: "heartbeat_rgpt-local-test_1" },
    authority: { authContextHash: "abc", policyProfile: "test" },
    integrity: { eventHash: "h1", prevEventHash: null },
    ...overrides,
  };
}

test("runtime status handles missing ledger and timeline files", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, true);

  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:05:00.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
  });

  assert.equal(report.ledger.exists, false);
  assert.equal(report.timeline.exists, false);
  assert.equal(report.ledger.status, "missing");
  assert.equal(report.timeline.status, "missing");
});

test("heartbeat status is never_seen when enabled but no heartbeat exists", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, true);
  await writeJsonl(fixture.ledgerPath, []);
  await writeJsonl(fixture.timelinePath, []);

  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:05:00.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
  });

  assert.equal(report.heartbeat.status, "never_seen");
  assert.equal(report.heartbeat.lastSeenAt, null);
});

test("heartbeat status is healthy when recent heartbeat exists", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, true);
  await writeJsonl(fixture.ledgerPath, [baseLedgerRecord()]);
  await writeJsonl(fixture.timelinePath, [baseTimelineRecord()]);

  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:00:20.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
  });

  assert.equal(report.heartbeat.status, "healthy");
  assert.equal(report.heartbeat.ageSeconds, 20);
});

test("heartbeat status is disabled when env or file gate blocks", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, false);
  await writeJsonl(fixture.ledgerPath, [baseLedgerRecord()]);
  await writeJsonl(fixture.timelinePath, [baseTimelineRecord()]);

  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:00:20.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "false" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
  });

  assert.equal(report.heartbeat.status, "disabled");
});

test("ledger summary parsing returns entry counts and failure counts", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, true);
  await writeJsonl(fixture.ledgerPath, [
    baseLedgerRecord({ timestamp: "2026-03-08T09:55:00.000Z" }),
    {
      entryId: "exec_2",
      timestamp: "2026-03-08T09:56:00.000Z",
      category: "execution",
      eventType: "execution.failed",
      action: "process_chat_user_request",
      source: "mesh_live_runtime",
      target: "cap.language.v1",
      status: "failed",
    },
    {
      entryId: "exec_3",
      timestamp: "2026-03-08T09:57:00.000Z",
      category: "execution",
      eventType: "execution.completed",
      action: "process_chat_user_request",
      source: "mesh_live_runtime",
      target: "cap.language.v1",
      status: "completed",
      metadata: {
        reason: "capability_verification_rejected:deny",
      },
    },
  ]);
  await writeJsonl(fixture.timelinePath, [baseTimelineRecord()]);

  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:00:00.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
  });

  assert.equal(report.ledger.entryCount, 3);
  assert.equal(report.ledger.heartbeatCount, 1);
  assert.equal(report.ledger.failedExecutionCount, 1);
  assert.equal(report.failures.recentCapabilityVerificationRejectionCount, 1);
});

test("timeline summary parsing returns last action and type", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, true);
  await writeJsonl(fixture.ledgerPath, [baseLedgerRecord()]);
  await writeJsonl(fixture.timelinePath, [
    baseTimelineRecord({ sequenceNo: 1, timestamp: "2026-03-08T09:59:00.000Z", eventType: "EXECUTION_STARTED", action: "start" }),
    baseTimelineRecord({ sequenceNo: 2, timestamp: "2026-03-08T10:00:00.000Z", eventType: "EXECUTION_COMPLETED", action: "finish" }),
  ]);

  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:00:30.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
  });

  assert.equal(report.timeline.eventCount, 2);
  assert.equal(report.timeline.lastAction, "finish");
  assert.equal(report.timeline.lastEventType, "EXECUTION_COMPLETED");
});

test("summary classification reports degraded on invalid artifacts", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, true);
  await writeFile(fixture.ledgerPath, "not-json\n", "utf8");
  await writeJsonl(fixture.timelinePath, [
    baseTimelineRecord({
      timestamp: "2026-03-08T10:00:00.000Z",
      status: "blocked",
      stage: "execution_denied",
    }),
  ]);

  const report = await collectRuntimeStatus({
    now: new Date("2026-03-08T10:01:00.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
  });

  assert.equal(report.summary.runtimeStatus, "degraded");
  assert.equal(report.summary.ledgerStatus, "invalid");
});

test("runtime status collection is read-only for runtime artifacts", async () => {
  const fixture = await createFixtureRoot();
  await writeKillSwitch(fixture.killSwitchPath, true);
  await writeJsonl(fixture.ledgerPath, [baseLedgerRecord()]);
  await writeJsonl(fixture.timelinePath, [baseTimelineRecord()]);

  const beforeLedgerStat = await stat(fixture.ledgerPath);
  const beforeTimelineStat = await stat(fixture.timelinePath);
  const beforeLedgerContents = await readFile(fixture.ledgerPath, "utf8");
  const beforeTimelineContents = await readFile(fixture.timelinePath, "utf8");

  await collectRuntimeStatus({
    now: new Date("2026-03-08T10:00:30.000Z"),
    env: { RGPT_HEARTBEAT_ENABLED: "true" },
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
    deepVerification: true,
  });

  const afterLedgerStat = await stat(fixture.ledgerPath);
  const afterTimelineStat = await stat(fixture.timelinePath);
  const afterLedgerContents = await readFile(fixture.ledgerPath, "utf8");
  const afterTimelineContents = await readFile(fixture.timelinePath, "utf8");

  assert.equal(beforeLedgerStat.mtimeMs, afterLedgerStat.mtimeMs);
  assert.equal(beforeTimelineStat.mtimeMs, afterTimelineStat.mtimeMs);
  assert.equal(beforeLedgerContents, afterLedgerContents);
  assert.equal(beforeTimelineContents, afterTimelineContents);
});
