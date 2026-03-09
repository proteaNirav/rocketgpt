import { runRuntimeSanitation } from "./runtime-sanitation-service";
import type { RuntimeSanitationScope } from "./runtime-sanitation.types";

interface CliOptions {
  dryRun: boolean;
  scope: RuntimeSanitationScope;
  quarantineInvalid: boolean;
  archiveOnly: boolean;
}

function parseScope(value: string | undefined): RuntimeSanitationScope {
  if (value === "runtime-artifacts" || value === "temp-artifacts" || value === "all") {
    return value;
  }
  return "all";
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    scope: "all",
    quarantineInvalid: false,
    archiveOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--scope") {
      options.scope = parseScope(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--quarantine-invalid") {
      options.quarantineInvalid = true;
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

  const options = parseCliOptions(runtimeProcess.argv.slice(2));
  const report = await runRuntimeSanitation(options);
  runtimeProcess.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

void main();
