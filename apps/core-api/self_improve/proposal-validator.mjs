import path from "node:path";
import { proposalSchemaPath, readJson } from "./paths.mjs";

const rootKeys = ["proposal_id", "finding", "plan", "verification", "approvals"];
const findingKeys = ["type", "severity", "summary", "evidence_refs"];
const planKeys = ["scope", "changes", "risk", "rollback"];
const scopeKeys = ["allowed_paths", "disallowed_paths", "max_files_changed"];
const changeKeys = ["kind", "path", "rationale"];
const verificationKeys = ["required_checks", "commands"];
const approvalsKeys = ["requires_human", "auto_merge_allowed"];

function parsePipeEnum(value) {
  return String(value || "")
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
}

function assertExactKeys(target, allowed, pathLabel, issues) {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    issues.push(`${pathLabel} must be an object`);
    return;
  }
  for (const key of Object.keys(target)) {
    if (!allowed.includes(key)) {
      issues.push(`${pathLabel}.${key} is not allowed`);
    }
  }
  for (const key of allowed) {
    if (!(key in target)) {
      issues.push(`${pathLabel}.${key} is required`);
    }
  }
}

function isStrArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

export function isProposalShape(value) {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.proposal_id === "string" &&
    value.finding &&
    value.plan &&
    value.verification &&
    value.approvals
  );
}

export async function validateProposal(proposal) {
  const schemaTemplate = await readJson(proposalSchemaPath, null);
  if (!schemaTemplate) {
    return { ok: false, errors: [`Missing schema template at ${proposalSchemaPath}`] };
  }
  if (!isProposalShape(proposal)) {
    return { ok: false, errors: ["proposal must match the top-level contract shape"] };
  }

  const findingTypeEnum = parsePipeEnum(schemaTemplate?.finding?.type);
  const severityEnum = parsePipeEnum(schemaTemplate?.finding?.severity);
  const riskEnum = parsePipeEnum(schemaTemplate?.plan?.risk);
  const changeKindEnum = parsePipeEnum(schemaTemplate?.plan?.changes?.[0]?.kind);

  const issues = [];
  assertExactKeys(proposal, rootKeys, "proposal", issues);
  assertExactKeys(proposal.finding, findingKeys, "proposal.finding", issues);
  assertExactKeys(proposal.plan, planKeys, "proposal.plan", issues);
  assertExactKeys(proposal.plan.scope, scopeKeys, "proposal.plan.scope", issues);
  assertExactKeys(proposal.verification, verificationKeys, "proposal.verification", issues);
  assertExactKeys(proposal.approvals, approvalsKeys, "proposal.approvals", issues);

  if (!findingTypeEnum.includes(proposal.finding.type)) {
    issues.push(`proposal.finding.type must be one of: ${findingTypeEnum.join(", ")}`);
  }
  if (!severityEnum.includes(proposal.finding.severity)) {
    issues.push(`proposal.finding.severity must be one of: ${severityEnum.join(", ")}`);
  }
  if (typeof proposal.finding.summary !== "string" || !proposal.finding.summary.trim()) {
    issues.push("proposal.finding.summary must be a non-empty string");
  }
  if (!isStrArray(proposal.finding.evidence_refs)) {
    issues.push("proposal.finding.evidence_refs must be an array of strings");
  }

  if (!riskEnum.includes(proposal.plan.risk)) {
    issues.push(`proposal.plan.risk must be one of: ${riskEnum.join(", ")}`);
  }
  if (!isStrArray(proposal.plan.scope.allowed_paths)) {
    issues.push("proposal.plan.scope.allowed_paths must be an array of strings");
  }
  if (!isStrArray(proposal.plan.scope.disallowed_paths)) {
    issues.push("proposal.plan.scope.disallowed_paths must be an array of strings");
  }
  if (
    !Number.isInteger(proposal.plan.scope.max_files_changed) ||
    proposal.plan.scope.max_files_changed < 1 ||
    proposal.plan.scope.max_files_changed > 200
  ) {
    issues.push("proposal.plan.scope.max_files_changed must be an integer between 1 and 200");
  }
  if (!Array.isArray(proposal.plan.changes) || proposal.plan.changes.length < 1) {
    issues.push("proposal.plan.changes must contain at least one change");
  } else {
    proposal.plan.changes.forEach((change, idx) => {
      assertExactKeys(change, changeKeys, `proposal.plan.changes[${idx}]`, issues);
      if (!changeKindEnum.includes(change.kind)) {
        issues.push(
          `proposal.plan.changes[${idx}].kind must be one of: ${changeKindEnum.join(", ")}`
        );
      }
      if (typeof change.path !== "string" || !change.path.trim()) {
        issues.push(`proposal.plan.changes[${idx}].path must be a non-empty string`);
      }
      if (typeof change.rationale !== "string" || !change.rationale.trim()) {
        issues.push(`proposal.plan.changes[${idx}].rationale must be a non-empty string`);
      }
    });
  }

  if (!isStrArray(proposal.verification.required_checks)) {
    issues.push("proposal.verification.required_checks must be an array of strings");
  }
  if (!isStrArray(proposal.verification.commands)) {
    issues.push("proposal.verification.commands must be an array of strings");
  }
  if (typeof proposal.approvals.requires_human !== "boolean") {
    issues.push("proposal.approvals.requires_human must be boolean");
  }
  if (typeof proposal.approvals.auto_merge_allowed !== "boolean") {
    issues.push("proposal.approvals.auto_merge_allowed must be boolean");
  }
  if (!/^SI-[A-Z0-9\-]+$/.test(proposal.proposal_id)) {
    issues.push("proposal.proposal_id must match SI-<ID>");
  }

  const proposalPath = path.join("docs", "self_improve", "proposals", `${proposal.proposal_id}.json`);
  return {
    ok: issues.length === 0,
    errors: issues,
    proposal_path: proposalPath,
  };
}
