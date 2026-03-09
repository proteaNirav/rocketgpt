import { test } from "node:test";
import * as assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resetRuntimeArtifacts } from "../runtime/runtime-artifact-reset";

async function setupFixture(): Promise<{
  root: string;
  ledgerPath: string;
  timelinePath: string;
  killSwitchPath: string;
  archiveDir: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "rgpt-runtime-reset-"));
  const meshDir = join(root, ".rocketgpt", "cognitive-mesh");
  const runtimeDir = join(root, ".rocketgpt", "runtime");
  const archiveDir = join(root, ".rocketgpt", "archive", "runtime");
  await mkdir(meshDir, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });

  const ledgerPath = join(meshDir, "execution-ledger.jsonl");
  const timelinePath = join(meshDir, "runtime-timeline.jsonl");
  const killSwitchPath = join(runtimeDir, "kill-switch.json");

  await writeFile(ledgerPath, '{"entryId":"x"}\n', "utf8");
  await writeFile(timelinePath, '{"eventId":"y"}\n', "utf8");
  await writeFile(killSwitchPath, JSON.stringify({ heartbeat: true, runtimeSignals: true, capabilityDispatch: true }), "utf8");

  return { root, ledgerPath, timelinePath, killSwitchPath, archiveDir };
}

test("dry-run reports planned actions without modifying artifacts", async () => {
  const fixture = await setupFixture();
  const beforeLedger = await readFile(fixture.ledgerPath, "utf8");
  const beforeTimeline = await readFile(fixture.timelinePath, "utf8");

  const result = await resetRuntimeArtifacts({
    dryRun: true,
    now: new Date("2026-03-08T12:00:00.000Z"),
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
    archiveDir: fixture.archiveDir,
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.actions.some((action) => action.type === "archive_planned"), true);
  assert.equal(result.actions.some((action) => action.type === "created"), false);

  const afterLedger = await readFile(fixture.ledgerPath, "utf8");
  const afterTimeline = await readFile(fixture.timelinePath, "utf8");
  assert.equal(afterLedger, beforeLedger);
  assert.equal(afterTimeline, beforeTimeline);
});

test("reset archives artifacts and recreates clean files", async () => {
  const fixture = await setupFixture();

  const result = await resetRuntimeArtifacts({
    now: new Date("2026-03-08T12:05:06.000Z"),
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
    archiveDir: fixture.archiveDir,
  });

  assert.equal(result.dryRun, false);
  assert.equal(result.archiveOnly, false);
  assert.equal(result.actions.some((action) => action.type === "archived" && action.artifact === "execution-ledger"), true);
  assert.equal(result.actions.some((action) => action.type === "archived" && action.artifact === "runtime-timeline"), true);

  const ledgerStat = await stat(fixture.ledgerPath);
  const timelineStat = await stat(fixture.timelinePath);
  assert.equal(ledgerStat.size, 0);
  assert.equal(timelineStat.size, 0);

  const archivedLedgerPath = join(fixture.archiveDir, "execution-ledger-20260308-120506.jsonl");
  const archivedTimelinePath = join(fixture.archiveDir, "runtime-timeline-20260308-120506.jsonl");
  const archivedLedger = await readFile(archivedLedgerPath, "utf8");
  const archivedTimeline = await readFile(archivedTimelinePath, "utf8");
  assert.equal(archivedLedger.includes("entryId"), true);
  assert.equal(archivedTimeline.includes("eventId"), true);
});

test("archive-only mode does not recreate clean artifacts", async () => {
  const fixture = await setupFixture();

  const result = await resetRuntimeArtifacts({
    archiveOnly: true,
    now: new Date("2026-03-08T12:06:07.000Z"),
    ledgerPath: fixture.ledgerPath,
    timelinePath: fixture.timelinePath,
    killSwitchPath: fixture.killSwitchPath,
    archiveDir: fixture.archiveDir,
  });

  assert.equal(result.archiveOnly, true);
  assert.equal(result.actions.some((action) => action.type === "skipped_create_archive_only"), true);

  await assert.rejects(() => stat(fixture.ledgerPath));
  await assert.rejects(() => stat(fixture.timelinePath));

  const archivedLedgerPath = join(fixture.archiveDir, "execution-ledger-20260308-120607.jsonl");
  const archivedTimelinePath = join(fixture.archiveDir, "runtime-timeline-20260308-120607.jsonl");
  const archivedLedger = await readFile(archivedLedgerPath, "utf8");
  const archivedTimeline = await readFile(archivedTimelinePath, "utf8");
  assert.equal(archivedLedger.includes("entryId"), true);
  assert.equal(archivedTimeline.includes("eventId"), true);
});
