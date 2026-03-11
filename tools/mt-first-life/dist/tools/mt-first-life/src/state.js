import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const repoRoot = resolve(process.cwd());
const mishtiDir = resolve(repoRoot, ".mishti");
const stateFiles = {
    tasks: resolve(mishtiDir, "tasks.json"),
    evidence: resolve(mishtiDir, "evidence.json"),
    builders: resolve(mishtiDir, "builders.json"),
    governance: resolve(mishtiDir, "governance.json"),
    awareness: resolve(mishtiDir, "awareness.json"),
    runtime: resolve(mishtiDir, "runtime.json"),
};
const defaults = {
    tasks: { tasks: [], rejections: [] },
    evidence: { entries: [] },
    builders: { builders: [] },
    governance: {
        mode: "normal",
        constitutionVersion: "v1",
        decisions: [],
    },
    awareness: {
        selfState: "stable",
        familyState: "cohesive",
        boundaryState: "clear",
        unsafeTrustSignals: [],
    },
    runtime: {
        survivalState: "normal",
        runtimeEligibilityDefaults: ["sandbox_runner", "cats_gateway", "os_adapter"],
    },
};
async function ensureStateFile(key) {
    await mkdir(mishtiDir, { recursive: true });
    try {
        await readFile(stateFiles[key], "utf8");
    }
    catch {
        await writeFile(stateFiles[key], JSON.stringify(defaults[key], null, 2), "utf8");
    }
}
async function readState(key) {
    await ensureStateFile(key);
    const raw = await readFile(stateFiles[key], "utf8");
    return JSON.parse(raw);
}
async function writeState(key, value) {
    await ensureStateFile(key);
    await writeFile(stateFiles[key], JSON.stringify(value, null, 2), "utf8");
}
export async function initializeState() {
    await Promise.all(Object.keys(stateFiles).map((key) => ensureStateFile(key)));
}
export async function loadTasksState() { return readState("tasks"); }
export async function saveTasksState(value) { return writeState("tasks", value); }
export async function loadEvidenceState() { return readState("evidence"); }
export async function saveEvidenceState(value) { return writeState("evidence", value); }
export async function loadBuildersState() { return readState("builders"); }
export async function saveBuildersState(value) { return writeState("builders", value); }
export async function loadGovernanceState() { return readState("governance"); }
export async function saveGovernanceState(value) { return writeState("governance", value); }
export async function loadAwarenessState() { return readState("awareness"); }
export async function saveAwarenessState(value) { return writeState("awareness", value); }
export async function loadRuntimeState() { return readState("runtime"); }
export async function saveRuntimeState(value) { return writeState("runtime", value); }
export function getStateFilePaths() {
    return stateFiles;
}
export function getRepoRoot() {
    return repoRoot;
}
