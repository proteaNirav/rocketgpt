import { runRuntimeStabilityCycle } from "./stability/runtime-stability-orchestrator";

interface CliOptions {
  runtimeId?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--runtime-id") {
      options.runtimeId = argv[i + 1];
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

  const options = parseArgs(runtimeProcess.argv.slice(2));
  const result = await runRuntimeStabilityCycle({
    runtimeId: options.runtimeId,
    env: process.env,
  });

  runtimeProcess.stdout.write(
    `${JSON.stringify(
      {
        skipped: result.skipped,
        cooldownActive: result.cooldownActive,
        reasonCodes: result.reasonCodes,
        evaluation: result.evaluation,
      },
      null,
      2
    )}\n`
  );
}

void main();
