import fs from "node:fs";
import path from "node:path";

function repoRootFromCwd() {
  let cursor = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(cursor, "rocketgpt_v3_full")) || fs.existsSync(path.join(cursor, "cats"))) {
      return cursor;
    }
    const next = path.resolve(cursor, "..");
    if (next === cursor) break;
    cursor = next;
  }
  return process.cwd();
}

function timelineRootPath() {
  return path.join(repoRootFromCwd(), "rocketgpt_v3_full", "webapp", "next", ".next", "cache", "timelines");
}

function timelineFilePath(runId) {
  return path.join(timelineRootPath(), `${String(runId)}.jsonl`);
}

function parseLine(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadEvents(runId) {
  const fp = timelineFilePath(runId);
  try {
    const raw = fs.readFileSync(fp, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseLine)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function appendTimelineEvent(input) {
  const runId = String(input?.runId || "").trim();
  if (!runId) throw new Error("runId is required");
  const fp = timelineFilePath(runId);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const previous = loadEvents(runId);
  const seq = previous.length > 0 ? Number(previous[previous.length - 1].seq || 0) + 1 : 1;
  const event = {
    seq,
    runId,
    planId: input?.planId ? String(input.planId) : null,
    type: String(input?.type || "EVENT"),
    ts: new Date().toISOString(),
    payload: input?.payload && typeof input.payload === "object" ? input.payload : {},
  };
  fs.appendFileSync(fp, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

export function readTimelineEvents(runId, options = {}) {
  const events = loadEvents(runId);
  const afterSeq = Number.isFinite(options.afterSeq) ? Number(options.afterSeq) : 0;
  const limit = Number.isFinite(options.limit) ? Math.max(1, Number(options.limit)) : 200;
  const planId = options.planId ? String(options.planId) : null;

  let rows = events.filter((event) => Number(event.seq || 0) > afterSeq);
  if (planId) rows = rows.filter((event) => String(event.planId || "") === planId);
  return rows.slice(0, limit);
}

export function getTimelineSnapshot(runId, options = {}) {
  const rows = readTimelineEvents(runId, options);
  const lastSeq = rows.length > 0 ? Number(rows[rows.length - 1].seq || 0) : Number(options.afterSeq || 0);
  return {
    runId,
    events: rows,
    lastSeq,
  };
}

export function getTimelineEtag(runId) {
  const events = loadEvents(runId);
  const lastSeq = events.length > 0 ? Number(events[events.length - 1].seq || 0) : 0;
  return `W/"${String(runId)}:${events.length}:${lastSeq}"`;
}

export function clearTimelineForRun(runId) {
  const fp = timelineFilePath(runId);
  try {
    fs.unlinkSync(fp);
  } catch {
    // ignore
  }
}
