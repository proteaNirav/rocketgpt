import { resetRuntimeArtifacts } from "./runtime-artifact-reset";

interface CliOptions {
  dryRun: boolean;
  archiveOnly: boolean;
}

function parseOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    archiveOnly: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--archive-only") {
      options.archiveOnly = true;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const runtimeProcess = process as unknown as {
    argv: string[];
    stdout: { write: (text: string) => void };
  };
  const options = parseOptions(runtimeProcess.argv.slice(2));
  const result = await resetRuntimeArtifacts(options);
  runtimeProcess.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

void main();
