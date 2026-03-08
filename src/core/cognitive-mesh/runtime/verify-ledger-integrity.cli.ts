import { verifyRuntimeTimelineJsonlIntegrity } from "./execution-ledger";
import { formatLedgerIntegritySummary } from "./ledger-integrity-verifier";

interface CliProcess {
  argv: string[];
  stdout: { write: (text: string) => void };
  exitCode?: number;
}

async function main(): Promise<void> {
  const runtimeProcess = process as unknown as CliProcess;
  const filePath = runtimeProcess.argv[2] ?? ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
  const result = await verifyRuntimeTimelineJsonlIntegrity(filePath);
  runtimeProcess.stdout.write(`${formatLedgerIntegritySummary(result)}\n`);
  runtimeProcess.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.summary.status === "invalid") {
    runtimeProcess.exitCode = 2;
    return;
  }
  if (result.summary.status === "warning" || result.summary.status === "partial") {
    runtimeProcess.exitCode = 1;
    return;
  }
  runtimeProcess.exitCode = 0;
}

void main();
