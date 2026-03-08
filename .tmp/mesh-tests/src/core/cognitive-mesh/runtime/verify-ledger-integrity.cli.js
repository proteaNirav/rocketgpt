"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execution_ledger_1 = require("./execution-ledger");
const ledger_integrity_verifier_1 = require("./ledger-integrity-verifier");
async function main() {
    const runtimeProcess = process;
    const filePath = runtimeProcess.argv[2] ?? ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
    const result = await (0, execution_ledger_1.verifyRuntimeTimelineJsonlIntegrity)(filePath);
    runtimeProcess.stdout.write(`${(0, ledger_integrity_verifier_1.formatLedgerIntegritySummary)(result)}\n`);
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
