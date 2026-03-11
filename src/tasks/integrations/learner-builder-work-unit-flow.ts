import { TaskGovernanceAdapter } from "../adapters/task-governance-adapter";
import type { TaskGovernanceAdapterOptions } from "../adapters/task-governance-adapter.types";
import { mapBuilderEscalationToAction, mapBuilderReportToActions, mapWorkUnitToAssignmentAction, mapWorkUnitToCreateAction } from "./learner-builder-work-unit-mapping";
import type { BuilderWorkUnitEscalationInput, BuilderWorkUnitReportInput, LearnerBuilderWorkUnitAssignmentResult, LearnerBuilderWorkUnitCreateResult, LearnerBuilderWorkUnitEscalationResult, LearnerBuilderWorkUnitReportResult } from "./learner-builder-work-unit.types";
import type { LearnerBuilderWorkUnit } from "./learner-builder-work-unit";

export class LearnerBuilderWorkUnitFlow {
  private readonly taskAdapter: TaskGovernanceAdapter;
  private readonly workUnits = new Map<string, LearnerBuilderWorkUnit>();

  constructor(options?: TaskGovernanceAdapterOptions) {
    this.taskAdapter = new TaskGovernanceAdapter(options);
  }

  getTaskAdapter(): TaskGovernanceAdapter {
    return this.taskAdapter;
  }

  createWorkUnit(workUnit: LearnerBuilderWorkUnit): LearnerBuilderWorkUnitCreateResult {
    const action = mapWorkUnitToCreateAction(workUnit);
    const taskResult = this.taskAdapter.createTaskFromAction(action);
    this.workUnits.set(workUnit.workUnitId, cloneWorkUnit(workUnit));
    return {
      workUnit: cloneWorkUnit(workUnit),
      action,
      taskResult,
    };
  }

  assignWorkUnit(workUnitId: string, occurredAt?: string): LearnerBuilderWorkUnitAssignmentResult {
    const workUnit = this.getRequiredWorkUnit(workUnitId);
    const action = mapWorkUnitToAssignmentAction(workUnit, occurredAt);
    return {
      workUnitId,
      action,
      taskResult: this.taskAdapter.assignTaskFromAction(action),
    };
  }

  reportWorkUnit(input: BuilderWorkUnitReportInput): LearnerBuilderWorkUnitReportResult {
    const workUnit = this.getRequiredWorkUnit(input.workUnitId);
    const actions = mapBuilderReportToActions(workUnit, input);
    return {
      workUnitId: input.workUnitId,
      action: actions.reportAction,
      taskResult: this.taskAdapter.reportTaskFromAction(actions.reportAction),
      lifecycleResult: this.taskAdapter.applyLifecycleFromAction(actions.lifecycleAction),
    };
  }

  escalateWorkUnit(input: BuilderWorkUnitEscalationInput): LearnerBuilderWorkUnitEscalationResult {
    const workUnit = this.getRequiredWorkUnit(input.workUnitId);
    const action = mapBuilderEscalationToAction(workUnit, input);
    return {
      workUnitId: input.workUnitId,
      action,
      taskResult: this.taskAdapter.escalateTaskFromAction(action),
    };
  }

  markWorkUnitInProgress(workUnitId: string, summary: string, occurredAt?: string): LearnerBuilderWorkUnitReportResult {
    return this.reportWorkUnit({
      workUnitId,
      summary,
      state: "in_progress",
      occurredAt,
    });
  }

  markWorkUnitCompleted(workUnitId: string, summary: string, occurredAt?: string): LearnerBuilderWorkUnitReportResult {
    return this.reportWorkUnit({
      workUnitId,
      summary,
      state: "completed",
      occurredAt,
    });
  }

  markWorkUnitBlocked(
    workUnitId: string,
    summary: string,
    blockers: string[],
    occurredAt?: string
  ): LearnerBuilderWorkUnitReportResult {
    return this.reportWorkUnit({
      workUnitId,
      summary,
      state: "blocked",
      blockers,
      occurredAt,
    });
  }

  private getRequiredWorkUnit(workUnitId: string): LearnerBuilderWorkUnit {
    const workUnit = this.workUnits.get(workUnitId);
    if (!workUnit) {
      throw new Error(`Learner-builder work unit not found: ${workUnitId}`);
    }
    return cloneWorkUnit(workUnit);
  }
}

function cloneWorkUnit(workUnit: LearnerBuilderWorkUnit): LearnerBuilderWorkUnit {
  return {
    ...workUnit,
    builderTypeHints: workUnit.builderTypeHints ? [...workUnit.builderTypeHints] : undefined,
    acceptanceCriteria: workUnit.acceptanceCriteria ? [...workUnit.acceptanceCriteria] : undefined,
    dependencyReferences: workUnit.dependencyReferences ? [...workUnit.dependencyReferences] : undefined,
    evidenceReferences: workUnit.evidenceReferences ? [...workUnit.evidenceReferences] : undefined,
    expectedOutputs: workUnit.expectedOutputs ? [...workUnit.expectedOutputs] : undefined,
  };
}
