import { collectRuntimeStatus, formatRuntimeStatusHuman } from "./runtime-status";

interface CliOptions {
  deepVerification: boolean;
  human: boolean;
  verbose: boolean;
  maxFindings?: number;
  runtimeId?: string;
  ledgerPath?: string;
  timelinePath?: string;
  killSwitchPath?: string;
  recentWindowHours?: number;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    deepVerification: false,
    human: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--deep") {
      options.deepVerification = true;
      continue;
    }
    if (arg === "--human") {
      options.human = true;
      continue;
    }
    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }
    if (arg === "--runtime-id") {
      options.runtimeId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--ledger-path") {
      options.ledgerPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--timeline-path") {
      options.timelinePath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--kill-switch-path") {
      options.killSwitchPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--recent-window-hours") {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        options.recentWindowHours = value;
      }
      i += 1;
      continue;
    }
    if (arg === "--max-findings") {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        options.maxFindings = Math.floor(value);
      }
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
  const args = runtimeProcess.argv.slice(2);
  const options = parseCliOptions(args);
  const report = await collectRuntimeStatus({
    runtimeId: options.runtimeId,
    ledgerPath: options.ledgerPath,
    timelinePath: options.timelinePath,
    killSwitchPath: options.killSwitchPath,
    deepVerification: options.deepVerification,
    includeDeepDetails: options.verbose,
    maxDetailFindings: options.maxFindings,
    recentWindowHours: options.recentWindowHours,
  });

  if (options.human) {
    runtimeProcess.stdout.write(`${formatRuntimeStatusHuman(report)}\n`);
    return;
  }

  runtimeProcess.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

void main();
