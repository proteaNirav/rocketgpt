import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  AwarenessState,
  BuildersState,
  EvidenceState,
  GovernanceState,
  RuntimeState,
  TasksState,
} from "./types.js";

const repoRoot = resolve(process.cwd());
const mishtiDir = resolve(repoRoot, ".mishti");

const stateFiles = {
  tasks: resolve(mishtiDir, "tasks.json"),
  evidence: resolve(mishtiDir, "evidence.json"),
  builders: resolve(mishtiDir, "builders.json"),
  governance: resolve(mishtiDir, "governance.json"),
  awareness: resolve(mishtiDir, "awareness.json"),
  runtime: resolve(mishtiDir, "runtime.json"),
} as const;

interface StateMap {
  tasks: TasksState;
  evidence: EvidenceState;
  builders: BuildersState;
  governance: GovernanceState;
  awareness: AwarenessState;
  runtime: RuntimeState;
}

const defaults: StateMap = {
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

type StateKey = keyof StateMap;

async function ensureStateFile<K extends StateKey>(key: K): Promise<void> {
  await mkdir(mishtiDir, { recursive: true });
  try {
    await readFile(stateFiles[key], "utf8");
  } catch {
    await writeFile(stateFiles[key], JSON.stringify(defaults[key], null, 2), "utf8");
  }
}

async function readState<K extends StateKey>(key: K): Promise<StateMap[K]> {
  await ensureStateFile(key);
  const raw = await readFile(stateFiles[key], "utf8");
  return JSON.parse(raw) as StateMap[K];
}

async function writeState<K extends StateKey>(key: K, value: StateMap[K]): Promise<void> {
  await ensureStateFile(key);
  await writeFile(stateFiles[key], JSON.stringify(value, null, 2), "utf8");
}

export async function initializeState(): Promise<void> {
  await Promise.all((Object.keys(stateFiles) as StateKey[]).map((key) => ensureStateFile(key)));
}

export async function loadTasksState(): Promise<TasksState> { return readState("tasks"); }
export async function saveTasksState(value: TasksState): Promise<void> { return writeState("tasks", value); }
export async function loadEvidenceState(): Promise<EvidenceState> { return readState("evidence"); }
export async function saveEvidenceState(value: EvidenceState): Promise<void> { return writeState("evidence", value); }
export async function loadBuildersState(): Promise<BuildersState> { return readState("builders"); }
export async function saveBuildersState(value: BuildersState): Promise<void> { return writeState("builders", value); }
export async function loadGovernanceState(): Promise<GovernanceState> { return readState("governance"); }
export async function saveGovernanceState(value: GovernanceState): Promise<void> { return writeState("governance", value); }
export async function loadAwarenessState(): Promise<AwarenessState> { return readState("awareness"); }
export async function saveAwarenessState(value: AwarenessState): Promise<void> { return writeState("awareness", value); }
export async function loadRuntimeState(): Promise<RuntimeState> { return readState("runtime"); }
export async function saveRuntimeState(value: RuntimeState): Promise<void> { return writeState("runtime", value); }

export function getStateFilePaths() {
  return stateFiles;
}

export function getRepoRoot(): string {
  return repoRoot;
}
