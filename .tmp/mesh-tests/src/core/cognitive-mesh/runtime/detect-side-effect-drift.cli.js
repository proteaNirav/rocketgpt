"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const execution_ledger_1 = require("./execution-ledger");
const side_effect_drift_detector_1 = require("./side-effect-drift-detector");
async function main() {
    const runtimeProcess = process;
    const filePath = runtimeProcess.argv[2] ?? ".rocketgpt/cognitive-mesh/runtime-timeline.jsonl";
    const result = await (0, execution_ledger_1.detectRuntimeTimelineSideEffectDrift)(filePath);
    runtimeProcess.stdout.write(`${(0, side_effect_drift_detector_1.formatSideEffectDriftSummary)(result)}\n`);
    runtimeProcess.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.summary.status === "drift_detected") {
        runtimeProcess.exitCode = 2;
        return;
    }
    if (result.summary.status === "warning" ||
        result.summary.status === "partial" ||
        result.summary.status === "inconclusive") {
        runtimeProcess.exitCode = 1;
        return;
    }
    runtimeProcess.exitCode = 0;
}
void main();
