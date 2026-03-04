import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readJson, proposalsDir, evidenceDir, relToRepo, repoRoot, writeJson, nowIso } from "./paths.mjs";
import { validateProposal } from "./proposal-validator.mjs";
import { writeExecutionLedger, writeDecisionLedger } from "./ledger.mjs";

function runCommand(command, args, cwd = repoRoot) {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, code: 0, stdout, stderr: "" };
  } catch (error) {
    return {
      ok: false,
      code: error?.status || 1,
      stdout: error?.stdout?.toString?.() || "",
      stderr: error?.stderr?.toString?.() || error?.message || "command failed",
    };
  }
}

function globToRegex(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "###ALL###")
    .replace(/\*/g, "[^/]*")
    .replace(/###ALL###/g, ".*");
  return new RegExp(`^${escaped}$`);
}

function matchesAny(filePath, patterns) {
  const normalized = filePath.replace(/\\/g, "/");
  return patterns.some((p) => globToRegex(p).test(normalized));
}

function listChangedFiles() {
  const out = runCommand("git", ["status", "--porcelain"]);
  if (!out.ok) return [];
  return out.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/g, "/"));
}

async function applyTypeImportFix(change) {
  const [_, __, symbol, fromModule] = change.rationale.split(":");
  const abs = path.join(repoRoot, change.path);
  const raw = await fs.readFile(abs, "utf8");
  const hasSymbol = new RegExp(`\\b${symbol}\\b`).test(raw);
  if (!hasSymbol) return { applied: false, reason: "symbol not found in file" };
  const importRegex = new RegExp(`import\\s+type\\s+\\{[^}]*\\b${symbol}\\b[^}]*\\}\\s+from\\s+['"]${fromModule}['"]`);
  if (importRegex.test(raw)) return { applied: false, reason: "type import already exists" };
  const next = `import type { ${symbol} } from "${fromModule}";\n${raw}`;
  await fs.writeFile(abs, next, "utf8");
  return { applied: true };
}

async function applyManualPlaceholder(change, proposalId) {
  const abs = path.join(repoRoot, change.path);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const existing = await fs.readFile(abs, "utf8").catch(() => "");
  const marker = `<!-- SELF_IMPROVE_TODO:${proposalId} -->`;
  if (existing.includes(marker)) return { applied: false, reason: "placeholder already exists" };
  const content = `${existing}\n${marker}\n- Proposal: ${proposalId}\n- Rationale: ${change.rationale}\n- Action: human review + bounded patch\n`;
  await fs.writeFile(abs, content.trimStart(), "utf8");
  return { applied: true };
}

async function applyDeterministicChanges(proposal) {
  const patchResults = [];
  for (const change of proposal.plan.changes) {
    if (change.rationale.startsWith("deterministic:prettier:")) {
      const target = change.rationale.slice("deterministic:prettier:".length);
      const result = runCommand("pnpm", ["--filter", "rocketgpt-ui", "exec", "prettier", "-w", target]);
      patchResults.push({ change, ...result });
      continue;
    }
    if (change.rationale.startsWith("deterministic:type-import:")) {
      const result = await applyTypeImportFix(change);
      patchResults.push({ change, ok: result.applied, code: result.applied ? 0 : 1, stdout: "", stderr: result.reason || "" });
      continue;
    }
    if (change.rationale.startsWith("manual_placeholder:")) {
      const result = await applyManualPlaceholder(change, proposal.proposal_id);
      patchResults.push({ change, ok: result.applied, code: result.applied ? 0 : 1, stdout: "", stderr: result.reason || "" });
      continue;
    }
    patchResults.push({ change, ok: false, code: 1, stdout: "", stderr: "unsupported change rationale" });
  }
  return patchResults;
}

function enforcePathScope(proposal, changedFiles) {
  const allowed = proposal.plan.scope.allowed_paths || [];
  const disallowed = proposal.plan.scope.disallowed_paths || [];
  for (const f of changedFiles) {
    if (matchesAny(f, disallowed)) {
      return { ok: false, reason: `changed disallowed file: ${f}` };
    }
    if (!matchesAny(f, allowed)) {
      return { ok: false, reason: `changed file outside allowed_paths: ${f}` };
    }
  }
  if (changedFiles.length > proposal.plan.scope.max_files_changed) {
    return {
      ok: false,
      reason: `max_files_changed exceeded (${changedFiles.length} > ${proposal.plan.scope.max_files_changed})`,
    };
  }
  return { ok: true };
}

function verifyPolicyGate() {
  const workflowPath = path.join(repoRoot, ".github", "workflows", "policy_gate.yml");
  return fs.access(workflowPath).then(
    () => ({ ok: true, output: "policy_gate workflow present" }),
    () => ({ ok: false, output: "policy_gate workflow missing" })
  );
}

async function verifySafeMode() {
  const guardPath = path.join(repoRoot, "rocketgpt_v3_full", "webapp", "next", "src", "rgpt", "api", "api-guard.ts");
  const raw = await fs.readFile(guardPath, "utf8").catch(() => "");
  if (/RGPT_SAFE_MODE/i.test(raw)) return { ok: true, output: "safe_mode gate present in api-guard.ts" };
  return { ok: false, output: "safe_mode gate missing in api-guard.ts" };
}

async function verifyReplay() {
  const replayRoot = path.join(repoRoot, "apps", "core-api", "replay", "evidence");
  const entries = await fs.readdir(replayRoot, { recursive: true }).catch(() => []);
  const latest = entries.find((e) => String(e).endsWith("replay_result.json"));
  if (!latest) return { ok: false, output: "no replay_result.json found" };
  return { ok: true, output: `replay evidence exists: ${latest}` };
}

function verifyTests() {
  const result = runCommand("pnpm", ["--filter", "rocketgpt-ui", "run", "typecheck"]);
  return { ok: result.ok, output: [result.stdout, result.stderr].filter(Boolean).join("\n") };
}

async function runVerificationChecks(requiredChecks) {
  const results = [];
  for (const check of requiredChecks) {
    if (check === "policy_gate") {
      results.push({ check, ...(await verifyPolicyGate()) });
      continue;
    }
    if (check === "safe_mode") {
      results.push({ check, ...(await verifySafeMode()) });
      continue;
    }
    if (check === "replay") {
      results.push({ check, ...(await verifyReplay()) });
      continue;
    }
    if (check === "tests") {
      results.push({ check, ...verifyTests() });
      continue;
    }
    results.push({ check, ok: false, output: "unknown verification check" });
  }
  return results;
}

export async function enforceProposalConstraints(proposal, changedFiles) {
  return enforcePathScope(proposal, changedFiles);
}

export async function applyTypeImportFixForTest(change) {
  return applyTypeImportFix(change);
}

export async function executeProposal({ proposalId, actor = "service:self-improve", dryRun = false }) {
  const proposalPath = path.join(proposalsDir, `${proposalId}.json`);
  const proposal = await readJson(proposalPath, null);
  if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);

  const validation = await validateProposal(proposal);
  if (!validation.ok) throw new Error(`Proposal invalid: ${validation.errors.join("; ")}`);

  const evidenceRoot = path.join(evidenceDir, proposalId, nowIso().replace(/[:.]/g, "-"));
  await fs.mkdir(evidenceRoot, { recursive: true });

  const preStatus = listChangedFiles();
  if (preStatus.length) {
    throw new Error(`Working tree is dirty; aborting execute. Pending files: ${preStatus.join(", ")}`);
  }

  const branchName = `self-improve/${proposalId}`;
  const branchResult = runCommand("git", ["checkout", "-b", branchName]);
  if (!branchResult.ok && !branchResult.stderr.includes("already exists")) {
    throw new Error(`Failed to create branch ${branchName}: ${branchResult.stderr}`);
  }
  if (!branchResult.ok && branchResult.stderr.includes("already exists")) {
    const switchResult = runCommand("git", ["checkout", branchName]);
    if (!switchResult.ok) throw new Error(`Failed to checkout ${branchName}: ${switchResult.stderr}`);
  }

  const patchResults = await applyDeterministicChanges(proposal);
  await writeJson(path.join(evidenceRoot, "patch_results.json"), patchResults);

  const changedFiles = listChangedFiles();
  const scopeCheck = enforcePathScope(proposal, changedFiles);
  if (!scopeCheck.ok) {
    throw new Error(`Scope enforcement failed: ${scopeCheck.reason}`);
  }

  const verification = await runVerificationChecks(proposal.verification.required_checks);
  await writeJson(path.join(evidenceRoot, "verification.json"), verification);
  const allChecksPass = verification.every((v) => v.ok);
  if (!allChecksPass) {
    throw new Error(`Verification failed: ${verification.filter((v) => !v.ok).map((v) => v.check).join(", ")}`);
  }

  let prUrl = null;
  if (!dryRun && changedFiles.length > 0) {
    const addResult = runCommand("git", ["add", ...changedFiles]);
    if (!addResult.ok) throw new Error(`git add failed: ${addResult.stderr}`);
    const commitResult = runCommand("git", ["commit", "-m", `self-improve: ${proposalId}`]);
    if (!commitResult.ok) throw new Error(`git commit failed: ${commitResult.stderr}`);

    const prBody = [
      `Self-Improve proposal: ${proposalId}`,
      "",
      `Evidence: ${relToRepo(evidenceRoot)}`,
      "Governance: policy_gate + safe_mode + tests + replay checks required.",
      "This PR was generated by bounded proposal execution.",
    ].join("\n");
    const prResult = runCommand("gh", [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      branchName,
      "--title",
      `self-improve: ${proposalId}`,
      "--body",
      prBody,
    ]);
    if (!prResult.ok) throw new Error(`gh pr create failed: ${prResult.stderr}`);
    prUrl = prResult.stdout.trim().split(/\r?\n/).find((line) => /^https?:\/\//.test(line)) || null;
  }

  const decisionEntry = await writeDecisionLedger({
    actor,
    action: "proposal_execute",
    proposal_id: proposalId,
    result: "success",
    evidence_refs: [relToRepo(evidenceRoot)],
  });
  const executionEntry = await writeExecutionLedger({
    actor,
    action: "execute_proposal",
    proposal_id: proposalId,
    evidence_refs: [relToRepo(evidenceRoot)],
    verification_checks: proposal.verification.required_checks,
    changed_files: changedFiles,
    dry_run: dryRun,
    pr_url: prUrl,
    decision_ledger_id: decisionEntry.ledger_id,
  });

  await writeJson(path.join(proposalsDir, `${proposalId}.meta.json`), {
    status: prUrl ? "pr-open" : "executed",
    updated_at: nowIso(),
    last_execution_ledger_id: executionEntry.ledger_id,
    pr_url: prUrl,
  });

  return {
    proposal_id: proposalId,
    branch: branchName,
    changed_files: changedFiles,
    verification,
    pr_url: prUrl,
    decision_ledger_id: decisionEntry.ledger_id,
    execution_ledger_id: executionEntry.ledger_id,
    evidence_root: relToRepo(evidenceRoot),
  };
}
