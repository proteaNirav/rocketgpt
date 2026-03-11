import type { TaskChainReference, TaskChainReferenceCreateInput } from "./task-chain-reference";
import type { AttachDownstreamTaskInput, TaskChainTraceResult } from "./task-chain-trace.types";

export class InMemoryTaskChainTrace {
  private readonly references = new Map<string, TaskChainReference>();

  createChainReference(input: TaskChainReferenceCreateInput): TaskChainReference {
    validateReferenceInput(input);
    const reference: TaskChainReference = {
      traceId: input.traceId ?? buildTraceId(input),
      parentTaskId: input.parentTaskId ?? input.upstreamTaskId,
      upstreamTaskId: input.upstreamTaskId,
      downstreamTaskId: input.downstreamTaskId,
      handoffFlowId: input.handoffFlowId,
      edgeLabel: input.edgeLabel,
      createdAt: input.createdAt ?? new Date().toISOString(),
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    if (this.references.has(reference.traceId)) {
      throw new Error(`Task chain reference already exists: ${reference.traceId}`);
    }

    this.references.set(reference.traceId, cloneReference(reference));
    return cloneReference(reference);
  }

  attachDownstreamTask(input: AttachDownstreamTaskInput): TaskChainReference {
    if (!input.parentTaskId) {
      throw new Error("Task chain downstream attachment requires parentTaskId");
    }
    if (!input.downstreamTaskId) {
      throw new Error("Task chain downstream attachment requires downstreamTaskId");
    }

    return this.createChainReference({
      parentTaskId: input.parentTaskId,
      upstreamTaskId: input.parentTaskId,
      downstreamTaskId: input.downstreamTaskId,
      handoffFlowId: input.handoffFlowId,
      edgeLabel: input.edgeLabel,
      createdAt: input.createdAt,
      metadata: input.metadata,
    });
  }

  listDownstreamTasks(parentTaskId: string): string[] {
    return this.getSortedReferences()
      .filter((reference) => reference.parentTaskId === parentTaskId && reference.downstreamTaskId)
      .map((reference) => reference.downstreamTaskId as string);
  }

  getUpstreamTask(taskId: string): string | null {
    const reference = this.getSortedReferences().find((item) => item.downstreamTaskId === taskId);
    return reference?.upstreamTaskId ?? reference?.parentTaskId ?? null;
  }

  getTaskChain(taskId: string): TaskChainTraceResult {
    const references = this.getSortedReferences();
    const rootTaskId = this.findRootTaskId(taskId, references);
    const taskIds: string[] = [];
    const visitedTasks = new Set<string>();

    this.collectDownstreamTaskIds(rootTaskId, references, taskIds, visitedTasks);

    if (!visitedTasks.has(taskId)) {
      taskIds.push(taskId);
      visitedTasks.add(taskId);
    }

    const relevantReferences = references.filter((reference) => {
      const upstream = reference.upstreamTaskId ?? reference.parentTaskId;
      return Boolean(
        (upstream && visitedTasks.has(upstream)) ||
          (reference.downstreamTaskId && visitedTasks.has(reference.downstreamTaskId))
      );
    });

    return {
      taskId,
      rootTaskId,
      taskIds,
      references: relevantReferences.map(cloneReference),
    };
  }

  listReferences(): TaskChainReference[] {
    return this.getSortedReferences().map(cloneReference);
  }

  private getSortedReferences(): TaskChainReference[] {
    return [...this.references.values()]
      .map(cloneReference)
      .sort((left, right) => {
        if (left.createdAt === right.createdAt) {
          return left.traceId.localeCompare(right.traceId);
        }
        return left.createdAt.localeCompare(right.createdAt);
      });
  }

  private findRootTaskId(taskId: string, references: TaskChainReference[]): string {
    let currentTaskId = taskId;
    const seen = new Set<string>();

    while (!seen.has(currentTaskId)) {
      seen.add(currentTaskId);
      const upstreamReference = references.find((reference) => reference.downstreamTaskId === currentTaskId);
      const upstreamTaskId = upstreamReference?.upstreamTaskId ?? upstreamReference?.parentTaskId;
      if (!upstreamTaskId) {
        return currentTaskId;
      }
      currentTaskId = upstreamTaskId;
    }

    return currentTaskId;
  }

  private collectDownstreamTaskIds(
    taskId: string,
    references: TaskChainReference[],
    taskIds: string[],
    visitedTasks: Set<string>
  ): void {
    if (visitedTasks.has(taskId)) {
      return;
    }

    visitedTasks.add(taskId);
    taskIds.push(taskId);

    const downstreamReferences = references.filter(
      (reference) => (reference.upstreamTaskId ?? reference.parentTaskId) === taskId && reference.downstreamTaskId
    );

    for (const reference of downstreamReferences) {
      this.collectDownstreamTaskIds(reference.downstreamTaskId as string, references, taskIds, visitedTasks);
    }
  }
}

function validateReferenceInput(input: TaskChainReferenceCreateInput): void {
  if (!input.handoffFlowId) {
    throw new Error("Task chain reference requires handoffFlowId");
  }
  if (!input.parentTaskId && !input.upstreamTaskId && !input.downstreamTaskId) {
    throw new Error("Task chain reference requires parentTaskId, upstreamTaskId, or downstreamTaskId");
  }
}

function buildTraceId(input: TaskChainReferenceCreateInput): string {
  return [
    input.handoffFlowId,
    input.parentTaskId ?? "no-parent",
    input.upstreamTaskId ?? "no-upstream",
    input.downstreamTaskId ?? "no-downstream",
  ].join(":");
}

function cloneReference(reference: TaskChainReference): TaskChainReference {
  return {
    ...reference,
    metadata: reference.metadata ? { ...reference.metadata } : undefined,
  };
}
