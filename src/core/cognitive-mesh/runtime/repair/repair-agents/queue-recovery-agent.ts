import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RuntimeRepairAgentExecutionContext, RuntimeRepairAgentResult } from "../runtime-repair.types";

export class QueueRecoveryAgent {
  readonly id = "queue_recovery_agent";

  async execute(context: RuntimeRepairAgentExecutionContext): Promise<RuntimeRepairAgentResult> {
    const startedAt = context.now.toISOString();
    await mkdir(dirname(context.config.queueRecoveryStatePath), { recursive: true });
    await writeFile(
      context.config.queueRecoveryStatePath,
      `${JSON.stringify(
        {
          runtimeId: context.runtimeId,
          targetType: context.diagnosis.likelyTargetType,
          targetId: context.diagnosis.likelyTargetId,
          recoveredAt: startedAt,
          mode: "queue_marker_rebuild_only",
          droppedTasks: 0,
          notes: ["no_tasks_removed"],
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    return {
      agentId: this.id,
      startedAt,
      completedAt: context.now.toISOString(),
      success: true,
      reasonCodes: ["QUEUE_RECOVERY_MARKER_WRITTEN"],
      metadata: {
        queueRecoveryStatePath: context.config.queueRecoveryStatePath,
      },
    };
  }
}
