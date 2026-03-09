import { runRuntimeHeartbeatObservationHarness } from "./observation/runtime-heartbeat-observation-orchestrator";

interface CliOptions {
  durationMs?: number;
  durationMinutes?: number;
  snapshotIntervalMs?: number;
  outputDir?: string;
  runtimeId?: string;
  smoke: boolean;
  includeMemorySamples?: boolean;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  return undefined;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { smoke: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--duration-ms") {
      options.durationMs = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--duration-minutes") {
      options.durationMinutes = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--snapshot-interval-ms") {
      options.snapshotIntervalMs = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--output-dir") {
      options.outputDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--runtime-id") {
      options.runtimeId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--smoke") {
      options.smoke = true;
      continue;
    }
    if (arg === "--include-memory-samples") {
      options.includeMemorySamples = parseBoolean(argv[i + 1]);
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

  const result = await runRuntimeHeartbeatObservationHarness({
    enabled: true,
    durationMs: options.durationMs,
    durationMinutes: options.durationMinutes,
    snapshotIntervalMs: options.snapshotIntervalMs,
    outputDir: options.outputDir,
    runtimeId: options.runtimeId,
    smoke: options.smoke,
    includeMemorySamples: options.includeMemorySamples,
    env: process.env,
  });

  runtimeProcess.stdout.write(
    `${JSON.stringify(
      {
        sessionId: result.summary.sessionId,
        startedAt: result.summary.startedAt,
        endedAt: result.summary.endedAt,
        plannedDurationMs: result.summary.plannedDurationMs,
        actualDurationMs: result.summary.actualDurationMs,
        snapshotIntervalMs: result.summary.snapshotIntervalMs,
        snapshotCount: result.summary.snapshotCount,
        outputDirectory: result.summary.outputDirectory,
        status: result.summary.status,
        reasonCodes: result.summary.reasonCodes,
        overhead: result.summary.overhead,
        signalNoiseAssessment: result.summary.signalNoiseAssessment,
        recommendation: result.summary.recommendation,
      },
      null,
      2
    )}\n`
  );
}

void main();
