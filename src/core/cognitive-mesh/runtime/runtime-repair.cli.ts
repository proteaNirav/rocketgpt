import { runRuntimeRepairCycle } from "./repair/runtime-repair-orchestrator";
import type { RuntimeRepairAnomalyType, RuntimeRepairSeverity } from "./repair/runtime-repair.types";

interface CliOptions {
  anomalyType?: RuntimeRepairAnomalyType;
  severity?: RuntimeRepairSeverity;
  runtimeId?: string;
  targetId?: string;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--anomaly-type") {
      options.anomalyType = argv[i + 1] as RuntimeRepairAnomalyType;
      i += 1;
      continue;
    }
    if (arg === "--severity") {
      options.severity = argv[i + 1] as RuntimeRepairSeverity;
      i += 1;
      continue;
    }
    if (arg === "--runtime-id") {
      options.runtimeId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--target-id") {
      options.targetId = argv[i + 1];
      i += 1;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const runtimeProcess = process as unknown as {
    argv: string[];
    stdout: { write: (text: string) => void };
  };

  const options = parseCliOptions(runtimeProcess.argv.slice(2));
  const result = await runRuntimeRepairCycle({
    runtimeId: options.runtimeId,
    anomalyType: options.anomalyType,
    severity: options.severity,
    targetId: options.targetId,
    env: process.env,
  });

  runtimeProcess.stdout.write(
    `${JSON.stringify(
      {
        status: result.status,
        skipped: result.skipped,
        cooldownActive: result.cooldownActive,
        diagnosis: result.diagnosis,
        repairAttempt: result.repairAttempt,
        validation: result.validation,
        reasonCodes: result.reasonCodes,
      },
      null,
      2
    )}\n`
  );
}

void main();
