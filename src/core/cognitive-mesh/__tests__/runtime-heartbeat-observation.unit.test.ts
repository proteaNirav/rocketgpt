import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runRuntimeHeartbeatObservationHarness } from "../runtime/observation/runtime-heartbeat-observation-orchestrator";
import { captureRuntimeHeartbeatObservationSnapshot, computeDirectorySizeForObservation } from "../runtime/observation/runtime-heartbeat-snapshot-capture";
import { buildRuntimeHeartbeatOverheadSummary, classifyObservationOverhead } from "../runtime/observation/runtime-heartbeat-resource-measurer";
import { buildRuntimeHeartbeatObservationSummary, buildRuntimeHeartbeatObservationMarkdownReport } from "../runtime/observation/runtime-heartbeat-observation-reporter";
import { resolveRuntimeHeartbeatObservationConfig } from "../runtime/observation/runtime-heartbeat-observation-config";
import type { RuntimeHeartbeatObservationSnapshot } from "../runtime/observation/runtime-heartbeat-observation.types";
import { ExecutionLedger } from "../runtime/execution-ledger";

interface Fixture {
  root: string;
  runtimeDir: string;
  observationsDir: string;
  ledgerPath: string;
  env: NodeJS.ProcessEnv;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-hb-observe-"));
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const observationsDir = join(runtimeDir, "observations");
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  await mkdir(runtimeDir, { recursive: true });
  await mkdir(observationsDir, { recursive: true });
  await mkdir(meshDir, { recursive: true });

  const ledgerPath = join(meshDir, "execution-ledger.jsonl");
  const env: NodeJS.ProcessEnv = {
    RGPT_HEARTBEAT_OBSERVATION_ENABLED: "true",
    RGPT_HEARTBEAT_OBSERVATION_OUTPUT_DIR: observationsDir,
    COGNITIVE_MESH_EXECUTION_LEDGER_JSONL_PATH: ledgerPath,
    RGPT_RUNTIME_ID: "rgpt-observe-test",
    RGPT_HEARTBEAT_ENABLED: "true",
    RGPT_HEARTBEAT_KILL_SWITCH_PATH: join(runtimeDir, "kill-switch.json"),
    RGPT_HEARTBEAT_STATE_PATH: join(runtimeDir, "heartbeat-state.json"),
    RGPT_RUNTIME_REPAIR_STATE_PATH: join(runtimeDir, "repair-state.json"),
    RGPT_RUNTIME_REPAIR_LEARNING_STATE_PATH: join(runtimeDir, "repair-learning-state.json"),
    RGPT_RUNTIME_CONTAINMENT_STATE_PATH: join(runtimeDir, "containment-state.json"),
    RGPT_RUNTIME_STABILITY_STATE_PATH: join(runtimeDir, "stability-state.json"),
    RGPT_RUNTIME_EVOLUTION_SIGNALS_STATE_PATH: join(runtimeDir, "evolution-signals.json"),
  };

  await writeFile(env.RGPT_HEARTBEAT_KILL_SWITCH_PATH!, JSON.stringify({ heartbeat: true }, null, 2), "utf8");

  return { root, runtimeDir, observationsDir, ledgerPath, env };
}

async function writeStateFile(path: string, payload: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test("session manifest creation and output directory behavior", async () => {
  const fixture = await createFixture();

  let fakeNow = Date.parse("2026-03-09T19:00:00.000Z");
  const result = await runRuntimeHeartbeatObservationHarness({
    enabled: true,
    env: fixture.env,
    durationMs: 12_000,
    snapshotIntervalMs: 4_000,
    outputDir: fixture.observationsDir,
    now: () => new Date(fakeNow),
    sleep: async (ms) => {
      fakeNow += ms;
    },
  });

  assert.equal(result.manifest.sessionId.startsWith("hb_obs_"), true);
  assert.equal(result.summary.status, "completed");
  assert.equal(result.summary.snapshotCount > 0, true);

  const manifestRaw = JSON.parse(await readFile(join(result.manifest.outputDirectory, "session-manifest.json"), "utf8")) as Record<string, unknown>;
  assert.equal(manifestRaw.status, "completed");
});

test("snapshot capture when all state files exist", async () => {
  const fixture = await createFixture();
  await writeStateFile(join(fixture.runtimeDir, "heartbeat-state.json"), { currentState: "healthy" });
  await writeStateFile(join(fixture.runtimeDir, "repair-state.json"), { status: "idle", summaryCounters: { total: 1 } });
  await writeStateFile(join(fixture.runtimeDir, "repair-learning-state.json"), { status: "analysis_completed" });
  await writeStateFile(join(fixture.runtimeDir, "containment-state.json"), { activeContainments: [] });
  await writeStateFile(join(fixture.runtimeDir, "stability-state.json"), { degradationState: { band: "normal" } });
  await writeStateFile(join(fixture.runtimeDir, "evolution-signals.json"), { summaryCounters: { totalLearningSignalsCaptured: 0 } });

  const snapshot = await captureRuntimeHeartbeatObservationSnapshot({
    config: {
      enabled: true,
      durationMs: 1000,
      snapshotIntervalMs: 1000,
      outputDir: fixture.observationsDir,
      smokeMode: true,
      includeMemorySamples: true,
      runtimeId: "rgpt-observe-test",
      ledgerPath: fixture.ledgerPath,
    },
    sessionStart: new Date("2026-03-09T19:10:00.000Z"),
    now: new Date("2026-03-09T19:10:01.000Z"),
    sessionDirectory: fixture.observationsDir,
    runtimeRootDir: fixture.runtimeDir,
    includeMemorySamples: true,
    cpuSampleStart: process.cpuUsage(),
    captureStartedAtMs: 0,
  });

  assert.equal(snapshot.stateFiles.every((item) => item.exists), true);
  assert.equal(snapshot.totalStateSizeBytes > 0, true);
});

test("snapshot capture when some state files are missing", async () => {
  const fixture = await createFixture();
  await writeStateFile(join(fixture.runtimeDir, "heartbeat-state.json"), { currentState: "healthy" });

  const snapshot = await captureRuntimeHeartbeatObservationSnapshot({
    config: {
      enabled: true,
      durationMs: 1000,
      snapshotIntervalMs: 1000,
      outputDir: fixture.observationsDir,
      smokeMode: true,
      includeMemorySamples: false,
      runtimeId: "rgpt-observe-test",
      ledgerPath: fixture.ledgerPath,
    },
    sessionStart: new Date("2026-03-09T19:11:00.000Z"),
    now: new Date("2026-03-09T19:11:01.000Z"),
    sessionDirectory: fixture.observationsDir,
    runtimeRootDir: fixture.runtimeDir,
    includeMemorySamples: false,
    cpuSampleStart: process.cpuUsage(),
    captureStartedAtMs: 0,
  });

  assert.equal(snapshot.stateFiles.some((item) => !item.exists), true);
  assert.equal(snapshot.reasonCodes.includes("SNAPSHOT_CAPTURED"), true);
});

test("storage aggregation correctness", async () => {
  const fixture = await createFixture();
  await writeFile(join(fixture.runtimeDir, "a.bin"), "abcd", "utf8");
  await writeFile(join(fixture.runtimeDir, "b.bin"), "efghij", "utf8");
  const size = await computeDirectorySizeForObservation(fixture.runtimeDir);
  assert.equal(size >= 10, true);
});

test("event count aggregation correctness for bounded evidence", async () => {
  const fixture = await createFixture();
  const ledger = new ExecutionLedger(fixture.ledgerPath, "");
  ledger.append({
    category: "runtime",
    eventType: "runtime.heartbeat",
    action: "runtime.heartbeat.manual.single",
    source: "manual_heartbeat_runner",
    target: "system_heartbeat",
    status: "completed",
    ids: { requestId: "1" },
    timestamp: "2026-03-09T19:20:00.000Z",
  });
  ledger.append({
    category: "runtime",
    eventType: "runtime_repair_failed",
    action: "runtime_repair_failed",
    source: "runtime_repair_orchestrator",
    target: "worker-1",
    status: "failed",
    ids: { requestId: "2" },
    timestamp: "2026-03-09T19:20:01.000Z",
  });

  const snapshot = await captureRuntimeHeartbeatObservationSnapshot({
    config: {
      enabled: true,
      durationMs: 1000,
      snapshotIntervalMs: 1000,
      outputDir: fixture.observationsDir,
      smokeMode: true,
      includeMemorySamples: false,
      runtimeId: "rgpt-observe-test",
      ledgerPath: fixture.ledgerPath,
    },
    sessionStart: new Date("2026-03-09T19:19:59.000Z"),
    now: new Date("2026-03-09T19:20:02.000Z"),
    sessionDirectory: fixture.observationsDir,
    runtimeRootDir: fixture.runtimeDir,
    includeMemorySamples: false,
    cpuSampleStart: process.cpuUsage(),
    captureStartedAtMs: 0,
  });

  assert.equal(snapshot.eventVolume.heartbeatEventCount >= 1, true);
  assert.equal(snapshot.eventVolume.repairEventCount >= 1, true);
});

test("summary/report generation", () => {
  const snapshots: RuntimeHeartbeatObservationSnapshot[] = [
    {
      snapshotId: "s1",
      timestamp: "2026-03-09T19:30:00.000Z",
      snapshotDurationMs: 50,
      stateFiles: [],
      totalStateSizeBytes: 100,
      runtimeDirectorySizeBytes: 1000,
      observationDirectorySizeBytes: 200,
      eventVolume: {
        heartbeatEventCount: 10,
        repairEventCount: 1,
        containmentEventCount: 0,
        stabilityEventCount: 0,
        evolutionEventCount: 0,
        totalEventCount: 11,
      },
      memoryUsageSample: { rss: 10, heapUsed: 5, heapTotal: 8, external: 1 },
      cpuUsageSample: { userMicros: 1000, systemMicros: 300 },
      reasonCodes: ["SNAPSHOT_CAPTURED"],
      metadata: {},
    },
  ];

  const overhead = buildRuntimeHeartbeatOverheadSummary({
    snapshots,
    totalObservationWriteBytes: 500,
    sessionDurationMs: 60_000,
  });

  const summary = buildRuntimeHeartbeatObservationSummary({
    sessionId: "session1",
    startedAt: "2026-03-09T19:30:00.000Z",
    endedAt: "2026-03-09T19:31:00.000Z",
    plannedDurationMs: 60_000,
    actualDurationMs: 60_000,
    snapshotIntervalMs: 5000,
    outputDirectory: ".rocketgpt/runtime/observations/session1",
    status: "completed",
    reasonCodes: ["OBSERVATION_SESSION_COMPLETED"],
    metadata: {},
    overhead,
    snapshots,
    notableAnomalies: [],
  });

  const report = buildRuntimeHeartbeatObservationMarkdownReport({
    summary,
    snapshots,
    notableAnomalies: [],
  });

  assert.equal(summary.snapshotCount, 1);
  assert.equal(report.includes("Runtime Heartbeat Observation Report"), true);
});

test("smoke mode behavior and bounded completion", async () => {
  const fixture = await createFixture();
  let fakeNow = Date.parse("2026-03-09T19:40:00.000Z");
  const result = await runRuntimeHeartbeatObservationHarness({
    enabled: true,
    env: fixture.env,
    smoke: true,
    outputDir: fixture.observationsDir,
    now: () => new Date(fakeNow),
    sleep: async (ms) => {
      fakeNow += ms;
    },
  });

  assert.equal(result.summary.snapshotCount <= 4, true);
  assert.equal(result.summary.actualDurationMs <= 20_000, true);
});

test("observation session completion after bounded duration in test mode", async () => {
  const fixture = await createFixture();
  let fakeNow = Date.parse("2026-03-09T19:50:00.000Z");
  const result = await runRuntimeHeartbeatObservationHarness({
    enabled: true,
    env: fixture.env,
    durationMs: 9_000,
    snapshotIntervalMs: 3_000,
    outputDir: fixture.observationsDir,
    now: () => new Date(fakeNow),
    sleep: async (ms) => {
      fakeNow += ms;
    },
  });

  assert.equal(result.summary.status, "completed");
  assert.equal(result.summary.actualDurationMs >= 9_000, true);
});

test("overhead assessment classification logic", () => {
  const light = classifyObservationOverhead({
    averageSnapshotDurationMs: 80,
    bytesPerHour: 200_000,
    eventsPerHour: 300,
  });
  const moderate = classifyObservationOverhead({
    averageSnapshotDurationMs: 250,
    bytesPerHour: 1_500_000,
    eventsPerHour: 1400,
  });
  const heavy = classifyObservationOverhead({
    averageSnapshotDurationMs: 700,
    bytesPerHour: 6_000_000,
    eventsPerHour: 6000,
  });

  assert.equal(light, "light");
  assert.equal(moderate, "moderate");
  assert.equal(heavy, "heavy");
});

test("config defaults use explicit opt-in and 2-hour baseline", () => {
  const config = resolveRuntimeHeartbeatObservationConfig({
    env: {
      RGPT_RUNTIME_ID: "rgpt-observe-test",
    },
  });
  assert.equal(config.enabled, false);
  assert.equal(config.durationMs, 2 * 60 * 60 * 1000);
  assert.equal(config.snapshotIntervalMs, 5 * 60 * 1000);
});
