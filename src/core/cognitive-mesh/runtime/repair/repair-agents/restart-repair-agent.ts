import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RuntimeRepairAgentExecutionContext, RuntimeRepairAgentResult } from "../runtime-repair.types";

export class RestartRepairAgent {
  readonly id = "restart_repair_agent";

  async execute(context: RuntimeRepairAgentExecutionContext): Promise<RuntimeRepairAgentResult> {
    const startedAt = context.now.toISOString();
    await mkdir(dirname(context.config.restartStatePath), { recursive: true });
    await writeFile(
      context.config.restartStatePath,
      `${JSON.stringify(
        {
          runtimeId: context.runtimeId,
          targetType: context.diagnosis.likelyTargetType,
          targetId: context.diagnosis.likelyTargetId,
          restartSignalAt: startedAt,
          sourceDiagnosisId: context.diagnosis.diagnosisId,
          mode: "bounded_restart_signal",
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
      reasonCodes: ["RESTART_SIGNAL_WRITTEN"],
      metadata: {
        restartStatePath: context.config.restartStatePath,
      },
    };
  }
}
