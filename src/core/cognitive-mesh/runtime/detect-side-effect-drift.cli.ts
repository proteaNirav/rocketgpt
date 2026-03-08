import { detectRuntimeTimelineSideEffectDrift } from "./execution-ledger";
import { formatSideEffectDriftSummary } from "./side-effect-drift-detector";

interface CliProcess {
  argv: string[];
  stdout: { write: (text: string) => void };
  exitCode?: number;
}

async function main(): Promise<void> {
  const runtimeProcess = process as unknown as CliProcess;
  const filePath = runtimeProcess.argv[2] ?? ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
  const result = await detectRuntimeTimelineSideEffectDrift(filePath);
  runtimeProcess.stdout.write(`${formatSideEffectDriftSummary(result)}\n`);
  runtimeProcess.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.summary.status === "drift_detected") {
    runtimeProcess.exitCode = 2;
    return;
  }
  if (
    result.summary.status === "warning" ||
    result.summary.status === "partial" ||
    result.summary.status === "inconclusive"
  ) {
    runtimeProcess.exitCode = 1;
    return;
  }
  runtimeProcess.exitCode = 0;
}

void main();
