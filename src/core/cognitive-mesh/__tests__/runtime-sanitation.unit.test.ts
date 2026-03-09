import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runRuntimeSanitation } from "../runtime/runtime-sanitation-service";

interface Fixture {
  root: string;
  executionLedgerPath: string;
  runtimeTimelinePath: string;
  killSwitchPath: string;
  tmpDirectoryPath: string;
  runtimeArchiveDir: string;
  tempArchiveDir: string;
  runtimeQuarantineDir: string;
  tempQuarantineDir: string;
}

async function createFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-d19-sanitation-"));
  const mesh = join(root, ".rocketgpt", "cognitive-mesh");
  const runtime = join(root, ".rocketgpt", "runtime");
  const tmp = join(root, ".tmp");
  await mkdir(mesh, { recursive: true });
  await mkdir(runtime, { recursive: true });
  await mkdir(tmp, { recursive: true });

  return {
    root,
    executionLedgerPath: join(mesh, "execution-ledger.jsonl"),
    runtimeTimelinePath: join(mesh, "runtime-timeline.jsonl"),
    killSwitchPath: join(runtime, "kill-switch.json"),
    tmpDirectoryPath: tmp,
    runtimeArchiveDir: join(root, ".rocketgpt", "archive", "runtime"),
    tempArchiveDir: join(root, ".rocketgpt", "archive", "temp"),
    runtimeQuarantineDir: join(root, ".rocketgpt", "quarantine", "runtime"),
    tempQuarantineDir: join(root, ".rocketgpt", "quarantine", "temp"),
  };
}

function optionsFromFixture(fixture: Fixture) {
  return {
    runtimeArtifactPaths: {
      executionLedgerPath: fixture.executionLedgerPath,
      runtimeTimelinePath: fixture.runtimeTimelinePath,
      killSwitchPath: fixture.killSwitchPath,
    },
    tempArtifactPaths: {
      tmpDirectoryPath: fixture.tmpDirectoryPath,
    },
    archiveRoots: {
      runtimeArchiveDir: fixture.runtimeArchiveDir,
      tempArchiveDir: fixture.tempArchiveDir,
    },
    quarantineRoots: {
      runtimeQuarantineDir: fixture.runtimeQuarantineDir,
      tempQuarantineDir: fixture.tempQuarantineDir,
    },
  };
}

async function writeRuntimeArtifacts(fixture: Fixture, timelineBody: string, ledgerBody: string): Promise<void> {
  await writeFile(fixture.executionLedgerPath, ledgerBody, "utf8");
  await writeFile(fixture.runtimeTimelinePath, timelineBody, "utf8");
  await writeFile(fixture.killSwitchPath, JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true }), "utf8");
}

test("dry-run does not mutate runtime artifacts", async () => {
  const fixture = await createFixture();
  await writeRuntimeArtifacts(
    fixture,
    '{"executionId":"bench-1","eventId":"e1","sequenceNo":1}\n',
    '{"entryId":"a1","ids":{"executionId":"bench-1"}}\n'
  );

  const beforeLedger = await readFile(fixture.executionLedgerPath, "utf8");
  const beforeTimeline = await readFile(fixture.runtimeTimelinePath, "utf8");

  const report = await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    dryRun: true,
    scope: "runtime-artifacts",
    now: new Date("2026-03-08T15:00:00.000Z"),
  });

  assert.equal(report.dryRun, true);
  assert.equal(report.summary.executedCount, 0);
  const afterLedger = await readFile(fixture.executionLedgerPath, "utf8");
  const afterTimeline = await readFile(fixture.runtimeTimelinePath, "utf8");
  assert.equal(beforeLedger, afterLedger);
  assert.equal(beforeTimeline, afterTimeline);
});

test("runtime contamination selects archive_and_refresh policy action", async () => {
  const fixture = await createFixture();
  await writeRuntimeArtifacts(
    fixture,
    '{"executionId":"exec-bench","eventId":"e1","sequenceNo":1}\n',
    '{"entryId":"a1","ids":{"executionId":"exec-bench"}}\n'
  );

  const report = await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    dryRun: true,
    scope: "runtime-artifacts",
    now: new Date("2026-03-08T15:01:00.000Z"),
  });

  const timelineAction = report.actionsSelected.find((action) => action.findingId === "runtime-timeline");
  assert.equal(timelineAction?.decision, "archive_and_refresh");
});

test("runtime archive-and-refresh archives old files and recreates fresh artifacts", async () => {
  const fixture = await createFixture();
  await writeRuntimeArtifacts(
    fixture,
    '{"executionId":"exec-bench","eventId":"e1","sequenceNo":1}\n',
    '{"entryId":"a1","ids":{"executionId":"exec-bench"}}\n'
  );

  const report = await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    scope: "runtime-artifacts",
    now: new Date("2026-03-08T15:02:03.000Z"),
  });

  assert.ok(report.summary.executedCount >= 2);
  const ledgerStat = await stat(fixture.executionLedgerPath);
  const timelineStat = await stat(fixture.runtimeTimelinePath);
  assert.equal(ledgerStat.size, 0);
  assert.equal(timelineStat.size, 0);

  const runtimeArchiveFiles = await readdir(fixture.runtimeArchiveDir);
  assert.equal(runtimeArchiveFiles.some((name) => name.startsWith("execution-ledger-20260308-150203")), true);
  assert.equal(runtimeArchiveFiles.some((name) => name.startsWith("runtime-timeline-20260308-150203")), true);
});

test("malformed runtime artifact is quarantined when quarantine-invalid is set", async () => {
  const fixture = await createFixture();
  await writeRuntimeArtifacts(
    fixture,
    '{"executionId":"exec-1","eventId":"e1","sequenceNo":1}\n',
    '{"entryId":"a1"\n'
  );

  const report = await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    scope: "runtime-artifacts",
    quarantineInvalid: true,
    now: new Date("2026-03-08T15:03:04.000Z"),
  });

  const ledgerAction = report.actionsSelected.find((action) => action.findingId === "execution-ledger");
  assert.equal(ledgerAction?.decision, "quarantine");

  const quarantineFiles = await readdir(fixture.runtimeQuarantineDir);
  assert.equal(quarantineFiles.some((name) => name.startsWith("execution-ledger-20260308-150304")), true);

  const ledgerStat = await stat(fixture.executionLedgerPath);
  assert.equal(ledgerStat.size, 0);
});

test("temp artifact scope archives transient .tmp safely", async () => {
  const fixture = await createFixture();
  await writeFile(join(fixture.tmpDirectoryPath, "scratch.txt"), "temp", "utf8");

  const report = await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    scope: "temp-artifacts",
    now: new Date("2026-03-08T15:04:05.000Z"),
  });

  assert.ok(report.actionsExecuted.some((item) => item.decision === "archive_and_refresh" && item.status === "executed"));

  const archivedTemp = await readdir(fixture.tempArchiveDir);
  assert.equal(archivedTemp.some((name) => name.startsWith(".tmp-20260308-150405")), true);

  const tmpEntries = await readdir(fixture.tmpDirectoryPath);
  assert.equal(tmpEntries.length, 0);
});

test("repeated sanitation runs are idempotent", async () => {
  const fixture = await createFixture();
  await writeRuntimeArtifacts(
    fixture,
    '{"executionId":"exec-bench","eventId":"e1","sequenceNo":1}\n',
    '{"entryId":"a1","ids":{"executionId":"exec-bench"}}\n'
  );

  await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    scope: "runtime-artifacts",
    now: new Date("2026-03-08T15:05:06.000Z"),
  });

  const second = await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    scope: "runtime-artifacts",
    now: new Date("2026-03-08T15:05:07.000Z"),
  });

  assert.equal(second.actionsExecuted.filter((action) => action.status === "executed").length, 0);
});

test("sanitation report is structured and machine-readable", async () => {
  const fixture = await createFixture();
  await writeRuntimeArtifacts(
    fixture,
    '{"executionId":"exec-bench","eventId":"e1","sequenceNo":1}\n',
    '{"entryId":"a1","ids":{"executionId":"exec-bench"}}\n'
  );

  const report = await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    dryRun: true,
    scope: "all",
    now: new Date("2026-03-08T15:06:07.000Z"),
  });

  assert.equal(typeof report.timestamp, "string");
  assert.equal(Array.isArray(report.findings), true);
  assert.equal(Array.isArray(report.actionsSelected), true);
  assert.equal(Array.isArray(report.actionsExecuted), true);
  assert.equal(typeof report.summary.executedCount, "number");
});

test("no hard deletes occur in normal sanitation mode", async () => {
  const fixture = await createFixture();
  const ledgerSource = '{"entryId":"a1","ids":{"executionId":"exec-bench"}}\n';
  const timelineSource = '{"executionId":"exec-bench","eventId":"e1","sequenceNo":1}\n';
  await writeRuntimeArtifacts(fixture, timelineSource, ledgerSource);

  await runRuntimeSanitation({
    ...optionsFromFixture(fixture),
    scope: "runtime-artifacts",
    now: new Date("2026-03-08T15:07:08.000Z"),
  });

  const archived = await readdir(fixture.runtimeArchiveDir);
  const archivedLedger = archived.find((name) => name.startsWith("execution-ledger-20260308-150708"));
  const archivedTimeline = archived.find((name) => name.startsWith("runtime-timeline-20260308-150708"));
  assert.ok(archivedLedger);
  assert.ok(archivedTimeline);

  const archivedLedgerBody = await readFile(join(fixture.runtimeArchiveDir, archivedLedger!), "utf8");
  const archivedTimelineBody = await readFile(join(fixture.runtimeArchiveDir, archivedTimeline!), "utf8");
  assert.equal(archivedLedgerBody, ledgerSource);
  assert.equal(archivedTimelineBody, timelineSource);
});
