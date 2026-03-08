"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRocketGptConstitutionV1FromYaml = loadRocketGptConstitutionV1FromYaml;
const promises_1 = require("node:fs/promises");
const DEFAULT_CONSTITUTION_PATH = "configs/governance/rgpt_constitution_v1.yaml";
function parseScalar(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}
function parseNumber(value) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
}
function validateDocumentShape(doc) {
    if (doc.version !== 1) {
        throw new Error("constitution_invalid:version");
    }
    if (doc.name !== "RocketGPT Constitutional Brain Layer") {
        throw new Error("constitution_invalid:name");
    }
    if (doc.status !== "defined") {
        throw new Error("constitution_invalid:status");
    }
    if (doc.enforcement_mode !== "deferred_phased_rollout") {
        throw new Error("constitution_invalid:enforcement_mode");
    }
    if (doc.principles.length !== 6) {
        throw new Error("constitution_invalid:principle_count");
    }
    const expectedOrder = [
        "governed_existence",
        "continuity_preservation",
        "reality_alignment",
        "self_awareness",
        "observational_learning",
        "trusted_steward_recognition_and_protection",
    ];
    for (let i = 0; i < expectedOrder.length; i += 1) {
        const principle = doc.principles[i];
        if (!principle) {
            throw new Error("constitution_invalid:principle_missing");
        }
        if (principle.id !== expectedOrder[i]) {
            throw new Error("constitution_invalid:principle_order");
        }
        if (principle.priority !== i + 1) {
            throw new Error("constitution_invalid:principle_priority");
        }
    }
    return doc;
}
async function loadRocketGptConstitutionV1FromYaml(filePath = DEFAULT_CONSTITUTION_PATH) {
    const text = await (0, promises_1.readFile)(filePath, "utf8");
    const lines = text.split(/\r?\n/);
    const principles = [];
    let currentPrinciple;
    let version;
    let name;
    let status;
    let enforcementMode;
    let inConstraints = false;
    for (const rawLine of lines) {
        const line = rawLine.replace(/\t/g, "  ");
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            continue;
        }
        if (trimmed.startsWith("version:")) {
            version = parseNumber(trimmed.slice("version:".length));
            continue;
        }
        if (trimmed.startsWith("name:")) {
            name = parseScalar(trimmed.slice("name:".length));
            continue;
        }
        if (trimmed.startsWith("status:")) {
            status = parseScalar(trimmed.slice("status:".length));
            continue;
        }
        if (trimmed.startsWith("enforcement_mode:")) {
            enforcementMode = parseScalar(trimmed.slice("enforcement_mode:".length));
            continue;
        }
        if (line.startsWith("  - id:")) {
            if (currentPrinciple) {
                principles.push({
                    id: currentPrinciple.id,
                    priority: currentPrinciple.priority,
                    title: currentPrinciple.title,
                    description: currentPrinciple.description,
                    constraints: currentPrinciple.constraints ?? [],
                });
            }
            currentPrinciple = {
                id: parseScalar(line.slice("  - id:".length)),
                constraints: [],
            };
            inConstraints = false;
            continue;
        }
        if (!currentPrinciple) {
            continue;
        }
        if (line.startsWith("    priority:")) {
            currentPrinciple.priority = parseNumber(line.slice("    priority:".length));
            inConstraints = false;
            continue;
        }
        if (line.startsWith("    title:")) {
            currentPrinciple.title = parseScalar(line.slice("    title:".length));
            inConstraints = false;
            continue;
        }
        if (line.startsWith("    description:")) {
            currentPrinciple.description = parseScalar(line.slice("    description:".length));
            inConstraints = false;
            continue;
        }
        if (line.startsWith("    constraints:")) {
            inConstraints = true;
            continue;
        }
        if (inConstraints && line.startsWith("      - ")) {
            currentPrinciple.constraints = [...(currentPrinciple.constraints ?? []), parseScalar(line.slice("      - ".length))];
            continue;
        }
    }
    if (currentPrinciple) {
        principles.push({
            id: currentPrinciple.id,
            priority: currentPrinciple.priority,
            title: currentPrinciple.title,
            description: currentPrinciple.description,
            constraints: currentPrinciple.constraints ?? [],
        });
    }
    return validateDocumentShape({
        version: version,
        name: name,
        status: status,
        enforcement_mode: enforcementMode,
        principles,
    });
}
