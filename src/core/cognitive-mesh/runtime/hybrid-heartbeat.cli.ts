import { runHybridHeartbeatMonitor } from "./hybrid-heartbeat";

interface CliOptions {
  runtimeId?: string;
  killSwitchPath?: string;
  statePath?: string;
  ledgerPath?: string;
  timelinePath?: string;
  staleAfterSeconds?: number;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;

    if (arg === "--runtime-id") {
      options.runtimeId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--kill-switch-path") {
      options.killSwitchPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--state-path") {
      options.statePath = argv[i + 1];
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
    if (arg === "--stale-after-seconds") {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        options.staleAfterSeconds = Math.floor(value);
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

  const options = parseCliOptions(runtimeProcess.argv.slice(2));
  const result = await runHybridHeartbeatMonitor({
    runtimeId: options.runtimeId,
    killSwitchPath: options.killSwitchPath,
    statePath: options.statePath,
    ledgerPath: options.ledgerPath,
    timelinePath: options.timelinePath,
    staleAfterSeconds: options.staleAfterSeconds,
    env: process.env,
  });

  runtimeProcess.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
}

void main();
