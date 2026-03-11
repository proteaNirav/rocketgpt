import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { BuilderTaskIntakeContract } from "../../../builders/builder-sdk/src/index.js";
import { docBuilder } from "../../../builders/doc-builder/src/index.js";
import type { PersistedTaskRecord, FirstLifeTaskDraft } from "./types.js";
import {
  getRepoRoot,
  initializeState,
  loadBuildersState,
  loadGovernanceState,
  loadRuntimeState,
  loadTasksState,
  saveGovernanceState,
  saveRuntimeState,
  saveTasksState,
} from "./state.js";
import { seedBuilders } from "./builders.js";
import { evaluateGovernance } from "./governance.js";
import { routeTask } from "./router.js";
import { appendEvidence } from "./evidence.js";

function now(): string {
  return new Date().toISOString();
}

export async function systemInit(): Promise<void> {
  await initializeState();
}

export async function listBuilders() {
  return (await loadBuildersState()).builders;
}

export async function listTasks() {
  return (await loadTasksState()).tasks;
}

export async function showTask(taskId: string) {
  return (await loadTasksState()).tasks.find((task) => task.id === taskId) ?? null;
}

export async function createTaskFromDraft(draft: FirstLifeTaskDraft): Promise<PersistedTaskRecord> {
  await initializeState();
  const tasksState = await loadTasksState();
  const runtimeState = await loadRuntimeState();

  const task: PersistedTaskRecord = {
    id: randomUUID(),
    type: draft.type,
    title: draft.title,
    requestedCapability: draft.requestedCapability,
    lifecycle: "created",
    payload: draft.payload,
    createdAt: now(),
    updatedAt: now(),
    governance: {
      decisionClass: "approval_required",
      eligibility: "bounded",
      reasonCode: "awaiting_governance_check",
      policyRefs: [],
    },
    trustRisk: {
      posture: "guarded",
      level: "low",
      boundary: "self",
      constraintClasses: [],
    },
  };

  const governance = evaluateGovernance(task, runtimeState);
  task.governance = {
    decisionClass: governance.decision.decisionClass,
    eligibility: governance.eligibility,
    reasonCode: governance.decision.reasonCode,
    policyRefs: governance.decision.policyRefs,
  };
  task.lifecycle = "queued";
  task.updatedAt = now();

  tasksState.tasks.push(task);
  await saveTasksState(tasksState);

  const governanceState = await loadGovernanceState();
  governanceState.decisions.push({
    taskId: task.id,
    checkedAt: now(),
    eligibility: task.governance.eligibility,
    decisionClass: task.governance.decisionClass,
    reasonCode: task.governance.reasonCode,
    policyRefs: task.governance.policyRefs,
  });
  await saveGovernanceState(governanceState);

  return task;
}

export async function runTask(taskId: string): Promise<PersistedTaskRecord> {
  await initializeState();
  const tasksState = await loadTasksState();
  const buildersState = await loadBuildersState();
  const runtimeState = await loadRuntimeState();
  const task = tasksState.tasks.find((item) => item.id === taskId);

  if (!task) {
    throw new Error(`Task ${taskId} was not found.`);
  }

  if (runtimeState.survivalState === "safe_mode" || runtimeState.survivalState === "emergency_stop") {
    throw new Error(`Task execution refused while survival state is ${runtimeState.survivalState}.`);
  }

  if (task.governance.decisionClass === "deny" || task.governance.decisionClass === "emergency_stop") {
    throw new Error(`Task execution blocked by governance decision ${task.governance.decisionClass}.`);
  }

  if (buildersState.builders.length === 0) {
    await seedBuilders();
  }

  const activeBuildersState = (await loadBuildersState());
  const { builder, assignment } = routeTask(activeBuildersState, task);
  task.assignment = assignment;
  task.lifecycle = "assigned";
  task.updatedAt = now();

  const intake: BuilderTaskIntakeContract = {
    taskId: task.id,
    title: task.title,
    lifecycle: "assigned",
    taskType: task.type,
    requestedCapability: task.requestedCapability,
    payload: task.payload,
    assignment,
    context: {
      taskId: task.id,
      boundedScope: assignment.boundedScope,
      trustPosture: builder.trustPosture,
      trustRisk: {
        trustPosture: task.trustRisk.posture,
        riskLevel: task.trustRisk.level,
        boundary: task.trustRisk.boundary,
        constraintClasses: task.trustRisk.constraintClasses,
      },
      boundary: task.trustRisk.boundary,
      survivalState: runtimeState.survivalState,
      governance: {
        traceId: task.id,
        routeId: assignment.assignmentId,
        decisionClass: task.governance.decisionClass,
        governanceHooks: assignment.governanceHooks,
      },
    },
  };

  const acceptance = docBuilder.acceptTask(intake);
  if (!acceptance.accepted) {
    tasksState.rejections.push({
      taskId: task.id,
      builderId: acceptance.builderId,
      reasonCode: acceptance.reasonCode,
      detail: acceptance.detail,
      timestamp: now(),
    });
    task.lifecycle = "suspended";
    task.updatedAt = now();
    await saveTasksState(tasksState);
    throw new Error(`Builder rejected task: ${acceptance.reasonCode}`);
  }

  task.lifecycle = "executing";
  task.updatedAt = now();
  await saveTasksState(tasksState);

  const result = await docBuilder.executeTask({ ...intake, lifecycle: "executing" });
  task.result = result;
  task.lifecycle = result.status === "completed" ? "completed" : "failed";
  task.updatedAt = now();

  if (task.lifecycle !== "completed") {
    await saveTasksState(tasksState);
    throw new Error(result.summary);
  }

  await appendEvidence(task);

  const outputPath = String(task.payload.outputPath ?? "");
  await readFile(resolve(getRepoRoot(), outputPath), "utf8");

  task.lifecycle = "verified";
  task.verification = {
    verified: true,
    verifiedAt: now(),
    verifier: "mishti.first-life.local-verifier",
    note: "output exists, evidence attached, governance and survival checks satisfied",
  };
  task.updatedAt = now();

  runtimeState.lastRunAt = now();
  await saveRuntimeState(runtimeState);
  await saveTasksState(tasksState);
  return task;
}

export async function setSurvivalState(state: "normal" | "throttled" | "degraded" | "subsystem_paused" | "node_isolated" | "safe_mode" | "emergency_stop") {
  const runtimeState = await loadRuntimeState();
  runtimeState.survivalState = state;
  runtimeState.lastRunAt = now();
  await saveRuntimeState(runtimeState);
  return runtimeState;
}

export async function getSurvivalState() {
  return loadRuntimeState();
}

export async function listEvidence() {
  return (await import("./state.js")).loadEvidenceState().then((state) => state.entries);
}

export async function showEvidence(taskId: string) {
  return (await import("./state.js")).loadEvidenceState().then((state) => state.entries.filter((entry) => entry.taskId === taskId));
}

export async function governanceCheck(taskId: string) {
  const task = await showTask(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} was not found.`);
  }
  return task.governance;
}
