import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ensureSelfImproveDirs, fileExists, readJson, relToRepo, repoRoot, walkFiles, writeJson } from "./paths.mjs";

function mkFindingId(type, idx) {
  return `FND-${type.toUpperCase()}-${String(idx).padStart(4, "0")}`;
}

async function writeEvidenceText(evidenceRoot, fileName, text) {
  const outputPath = path.join(evidenceRoot, fileName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, String(text ?? ""), "utf8");
  return relToRepo(outputPath);
}

function parseCiLogForAutofix(logText = "") {
  const text = String(logText);
  if (/prettier|code style issues|run prettier -w/i.test(text)) {
    return { kind: "prettier" };
  }
  const tsMissingImport = text.match(/Cannot find name '([A-Za-z0-9_]+)'/);
  if (tsMissingImport) {
    return { kind: "missing_type_import", symbol: tsMissingImport[1] };
  }
  return null;
}

async function loadCiRunsFromGh() {
  try {
    const out = execFileSync(
      "gh",
      ["run", "list", "--limit", "5", "--json", "databaseId,name,conclusion,headBranch,url"],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return JSON.parse(out);
  } catch {
    return [];
  }
}

export async function detectCiFailures(options) {
  const findings = [];
  const evidenceRefs = [];
  const evidenceRoot = options.evidenceRoot;
  const artifactPath = options.ciArtifactPath;

  let runs = [];
  if (artifactPath && (await fileExists(artifactPath))) {
    const parsed = await readJson(artifactPath, {});
    runs = Array.isArray(parsed) ? parsed : parsed.runs || [];
  } else {
    runs = await loadCiRunsFromGh();
  }

  let idx = 1;
  for (const run of runs) {
    const isFail = String(run.conclusion || "").toLowerCase() === "failure";
    if (!isFail) continue;
    const jobs = Array.isArray(run.jobs) ? run.jobs : [];
    if (!jobs.length) {
      const evRef = await writeEvidenceText(
        evidenceRoot,
        `ci/${run.databaseId || idx}/summary.txt`,
        JSON.stringify(run, null, 2)
      );
      evidenceRefs.push(evRef);
      findings.push({
        id: mkFindingId("ci_failure", idx++),
        type: "ci_failure",
        severity: "error",
        summary: `Workflow "${run.name || "unknown"}" failed`,
        evidence_refs: [evRef],
        impacted_paths: [],
        metadata: { workflow: run.name || "unknown", run_url: run.url || null },
      });
      continue;
    }

    for (const job of jobs) {
      const steps = Array.isArray(job.steps) ? job.steps : [];
      for (const step of steps) {
        const stepFail = String(step.conclusion || "").toLowerCase() === "failure";
        if (!stepFail) continue;
        const logText = step.log_excerpt || step.log || "";
        const evRef = await writeEvidenceText(
          evidenceRoot,
          `ci/${run.databaseId || idx}/${job.name || "job"}-${step.name || "step"}.log.txt`,
          logText
        );
        const autofix = parseCiLogForAutofix(logText);
        findings.push({
          id: mkFindingId("ci_failure", idx++),
          type: "ci_failure",
          severity: "error",
          summary: `CI failed in ${run.name || "workflow"} / ${job.name || "job"} / ${step.name || "step"}`,
          evidence_refs: [evRef],
          impacted_paths: step.paths || [],
          metadata: {
            workflow: run.name || "unknown",
            job: job.name || "unknown",
            step: step.name || "unknown",
            run_url: run.url || null,
            autofix,
          },
        });
      }
    }
  }

  return findings;
}

export async function detectPolicyViolations(options) {
  const findings = [];
  const evidenceRoot = options.evidenceRoot;
  const inputs = options.policyArtifactPaths || [];
  const defaultPaths = [
    path.join(repoRoot, "generated", "guard_result.json"),
    path.join(repoRoot, "rocketgpt_v3_full", "webapp", "next", "RGPT_SAFE_MODE_SCAN.txt"),
  ];
  const pathsToRead = inputs.length ? inputs : defaultPaths;

  let idx = 1;
  for (const p of pathsToRead) {
    if (!(await fileExists(p))) continue;
    const ext = path.extname(p).toLowerCase();
    let failed = false;
    let reason = "";
    let evidenceText = "";
    if (ext === ".json") {
      const j = await readJson(p, null);
      if (!j) continue;
      const okValue = j.ok ?? j.pass ?? j.passed;
      failed = okValue === false || String(j.status || "").toLowerCase() === "failed";
      reason = j.reason || j.error || j.message || "Gate reported failure";
      evidenceText = JSON.stringify(j, null, 2);
    } else {
      const t = await fs.readFile(p, "utf8");
      failed = /fail|violation|error/i.test(t);
      reason = t.trim().split(/\r?\n/)[0] || "Gate text output indicates a violation";
      evidenceText = t;
    }
    if (!failed) continue;

    const evRef = await writeEvidenceText(evidenceRoot, `policy/${path.basename(p)}.txt`, evidenceText);
    findings.push({
      id: mkFindingId("policy_violation", idx++),
      type: /db_exposure|secret|security/i.test(reason) ? "security_risk" : "policy_violation",
      severity: "critical",
      summary: `Governance gate failed: ${path.basename(p)} - ${reason}`,
      evidence_refs: [evRef],
      impacted_paths: [relToRepo(p)],
      metadata: { gate: path.basename(p), reason },
    });
  }
  return findings;
}

function summarizeDiff(diffObj) {
  if (!diffObj || typeof diffObj !== "object") return "Unknown replay diff";
  if (typeof diffObj.summary === "string") return diffObj.summary;
  if (Array.isArray(diffObj.differences) && diffObj.differences.length) {
    return `differences=${diffObj.differences.length}`;
  }
  return "Replay drift detected";
}

export async function detectReplayDrift(options) {
  const findings = [];
  const evidenceRoot = options.evidenceRoot;
  let replayPath = options.replayArtifactPath || "";

  if (!replayPath) {
    const replayEvidenceRoot = path.join(repoRoot, "apps", "core-api", "replay", "evidence");
    const files = await walkFiles(replayEvidenceRoot);
    const candidates = files.filter((f) => f.endsWith("replay_result.json"));
    candidates.sort((a, b) => b.localeCompare(a));
    replayPath = candidates[0] || "";
  }
  if (!replayPath || !(await fileExists(replayPath))) return findings;

  const replay = await readJson(replayPath, null);
  if (!replay) return findings;
  const drift = replay.semantic_drift === true || replay.drift_detected === true || replay.judge_passed === false;
  if (!drift) return findings;

  const diffSummary = summarizeDiff(replay.diff_summary || replay.diff_report || replay);
  const impacted = Array.isArray(replay.impacted_paths) ? replay.impacted_paths : [];
  const evRef = await writeEvidenceText(evidenceRoot, "replay/replay_result.json", JSON.stringify(replay, null, 2));

  findings.push({
    id: mkFindingId("replay_drift", 1),
    type: "replay_drift",
    severity: "error",
    summary: `Replay drift detected: ${diffSummary}`,
    evidence_refs: [evRef],
    impacted_paths: impacted,
    metadata: {
      contract_name: replay.contract_name || "replay_contract",
      diff_summary: diffSummary,
    },
  });
  return findings;
}

export async function runAllDetectors(options) {
  await ensureSelfImproveDirs();
  const findings = [];
  findings.push(...(await detectCiFailures(options)));
  findings.push(...(await detectPolicyViolations(options)));
  findings.push(...(await detectReplayDrift(options)));
  const outPath = path.join(options.evidenceRoot, "findings.raw.json");
  await writeJson(outPath, { findings });
  return findings;
}
