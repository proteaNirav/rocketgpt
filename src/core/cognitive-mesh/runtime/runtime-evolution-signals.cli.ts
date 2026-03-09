import { runRuntimeEvolutionSignalsCycle } from "./evolution-signals/runtime-evolution-signals-orchestrator";

interface CliOptions {
  runtimeId?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--runtime-id") {
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
  const result = await runRuntimeEvolutionSignalsCycle({
    runtimeId: options.runtimeId,
    env: process.env,
  });

  runtimeProcess.stdout.write(
    `${JSON.stringify(
      {
        skipped: result.skipped,
        reasonCodes: result.reasonCodes,
        evaluation: result.evaluation,
      },
      null,
      2
    )}\n`
  );
}

void main();
