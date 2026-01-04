import type { ResolveInput, ResolveResult, RuntimeMode, RuntimeModeConfig } from "./runtime-mode.types";
import fs from "node:fs";
import path from "node:path";

const LOCKED: RuntimeMode[] = ["SELF_EVOLUTION"];

export function loadRuntimeModeConfig(): RuntimeModeConfig {
  const p = path.join(process.cwd(), "src", "rgpt", "runtime", "runtime-mode.config.json");
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw) as RuntimeModeConfig;
}

function isLocked(mode: RuntimeMode): boolean {
  return LOCKED.includes(mode);
}

function pickBaseMode(input: ResolveInput, cfg: RuntimeModeConfig): RuntimeMode {
  // Priority: triggers downgrade > explicit requestedMode > envMode > currentMode > default
  const requested = input.requestedMode;
  const envMode = input.envMode;
  const current = input.currentMode;

  if (requested) return requested;
  if (envMode) return envMode;
  if (current) return current;
  return cfg.defaultMode;
}

export function resolveRuntimeMode(input: ResolveInput, cfg: RuntimeModeConfig): ResolveResult {
  const warnings: string[] = [];
  const blockedTransitions: string[] = [];

  // 1) Apply downgrade triggers (highest priority)
  if (input.triggers && input.triggers.length > 0) {
    // If multiple triggers exist, the safest resulting mode wins (SAFE preferred)
    const mapped = input.triggers
      .map(t => cfg.downgradeTriggers[t])
      .filter(Boolean);

    if (mapped.includes("SAFE")) {
      return { mode: "SAFE", reason: "Downgraded due to triggers (SAFE).", warnings, blockedTransitions };
    }
    if (mapped.includes("SUPERVISED")) {
      return { mode: "SUPERVISED", reason: "Downgraded due to triggers (SUPERVISED).", warnings, blockedTransitions };
    }
    // fallback
    return { mode: "SAFE", reason: "Downgraded due to triggers (fallback SAFE).", warnings, blockedTransitions };
  }

  // 2) Choose candidate
  const candidate = pickBaseMode(input, cfg);

  // 3) Hard-block locked modes
  if (isLocked(candidate)) {
    warnings.push("SELF_EVOLUTION is locked in S3; forcing SAFE.");
    return { mode: "SAFE", reason: "Locked mode requested; forced SAFE.", warnings, blockedTransitions };
  }

  // 4) Transition validation (if a current mode exists)
  const current = input.currentMode ?? cfg.defaultMode;
  const allowed = cfg.allowedTransitions[current] ?? [];
  if (candidate !== current && !allowed.includes(candidate)) {
    blockedTransitions.push(`${current} -> ${candidate}`);
    warnings.push("Requested transition is not allowed; keeping current mode.");
    return { mode: current === "SELF_EVOLUTION" ? "SAFE" : (current as Exclude<RuntimeMode, "SELF_EVOLUTION">), reason: "Transition blocked.", warnings, blockedTransitions };
  }

  // 5) Explicit confirmation requirement
  if (cfg.requireExplicitConfirmFor.includes(candidate) && !input.hasExplicitConfirmation) {
    warnings.push(`Explicit confirmation required for ${candidate}; forcing SAFE.`);
    return { mode: "SAFE", reason: "Missing explicit confirmation.", warnings, blockedTransitions };
  }

  return {
    mode: candidate as Exclude<RuntimeMode, "SELF_EVOLUTION">,
    reason: "Resolved successfully.",
    warnings,
    blockedTransitions
  };
}
