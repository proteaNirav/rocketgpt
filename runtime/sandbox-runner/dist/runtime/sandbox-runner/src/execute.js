import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const repoRoot = resolve(process.cwd());
function isAllowedDocumentTarget(targetPath) {
    const normalized = targetPath.replace(/\\/g, "/");
    return normalized === "docs/generated/first-life.md";
}
export async function executeBoundedDocumentWrite(input) {
    const { request, outputPath, content } = input;
    if (request.context.survivalState === "safe_mode" || request.context.survivalState === "emergency_stop") {
        return {
            requestId: request.requestId,
            status: "interrupted",
            summary: "runtime write interrupted by survival state",
            conditionedTrust: {
                outputTrustPosture: "guarded",
                validationRequired: true,
            },
            constraintClasses: ["node_degradation"],
            evidenceRefs: [],
            validationRefs: [],
        };
    }
    if (!isAllowedDocumentTarget(outputPath)) {
        return {
            requestId: request.requestId,
            status: "rejected",
            summary: "runtime target path is outside first-life bounded document scope",
            conditionedTrust: {
                outputTrustPosture: "locked",
                validationRequired: true,
            },
            constraintClasses: ["dependency_block"],
            evidenceRefs: [],
            validationRefs: [],
        };
    }
    const absoluteTargetPath = resolve(repoRoot, outputPath);
    await mkdir(dirname(absoluteTargetPath), { recursive: true });
    await writeFile(absoluteTargetPath, content, "utf8");
    return {
        requestId: request.requestId,
        status: "completed",
        summary: `bounded document write completed at ${outputPath}`,
        conditionedTrust: {
            outputTrustPosture: "guarded",
            validationRequired: true,
        },
        constraintClasses: [],
        evidenceRefs: [outputPath],
        validationRefs: ["validation-required:first-life-document"],
    };
}
