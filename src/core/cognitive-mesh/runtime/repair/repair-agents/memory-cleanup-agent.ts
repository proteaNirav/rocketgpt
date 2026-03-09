import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RuntimeRepairAgentExecutionContext, RuntimeRepairAgentResult } from "../runtime-repair.types";

function parseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export class MemoryCleanupAgent {
  readonly id = "memory_cleanup_agent";

  async execute(context: RuntimeRepairAgentExecutionContext): Promise<RuntimeRepairAgentResult> {
    const startedAt = context.now.toISOString();
    let previousTransientEntries = 0;

    try {
      const text = await readFile(context.config.transientMemoryPath, "utf8");
      const parsed = parseRecord(JSON.parse(text));
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      previousTransientEntries = entries.length;
    } catch {
      previousTransientEntries = 0;
    }

    await mkdir(dirname(context.config.transientMemoryPath), { recursive: true });
    await writeFile(
      context.config.transientMemoryPath,
      `${JSON.stringify(
        {
          schemaVersion: "rgpt.transient_memory_cache.v1",
          runtimeId: context.runtimeId,
          cleanedAt: startedAt,
          entries: [],
          previousTransientEntries,
          durableMemoryTouched: false,
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
      reasonCodes: ["TRANSIENT_MEMORY_CLEANED"],
      metadata: {
        transientMemoryPath: context.config.transientMemoryPath,
        previousTransientEntries,
      },
    };
  }
}
