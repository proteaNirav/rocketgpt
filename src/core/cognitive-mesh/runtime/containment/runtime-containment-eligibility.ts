import { readFile } from "node:fs/promises";
import type {
  RuntimeContainmentEligibilityDecision,
  RuntimeContainmentStateSurface,
  RuntimeContainmentStatus,
  RuntimeContainmentTargetType,
} from "./runtime-containment.types";

const BLOCKING_STATUSES: RuntimeContainmentStatus[] = [
  "contained",
  "under_repair",
  "recovery_validation",
  "observation",
  "retired",
];

function toStatus(value: unknown): RuntimeContainmentStatus {
  if (
    value === "healthy" ||
    value === "suspected" ||
    value === "contained" ||
    value === "under_repair" ||
    value === "recovery_validation" ||
    value === "observation" ||
    value === "reintegrated" ||
    value === "retired"
  ) {
    return value;
  }
  return "healthy";
}

function parseState(value: unknown): RuntimeContainmentStateSurface | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "rgpt.runtime_containment_state.v1") {
    return null;
  }
  if (!Array.isArray(record.activeContainments)) {
    return null;
  }
  return record as unknown as RuntimeContainmentStateSurface;
}

export async function evaluateRuntimeContainmentEligibility(
  targetType: RuntimeContainmentTargetType,
  targetId: string,
  statePath = process.env.RGPT_RUNTIME_CONTAINMENT_STATE_PATH ?? ".rocketgpt/runtime/containment-state.json"
): Promise<RuntimeContainmentEligibilityDecision> {
  try {
    const raw = await readFile(statePath, "utf8");
    const state = parseState(JSON.parse(raw));
    if (!state) {
      return {
        eligible: true,
        status: "healthy",
        reasonCodes: ["CONTAINMENT_STATE_UNAVAILABLE"],
        containment: null,
      };
    }

    const containment = state.activeContainments.find(
      (item) => item.targetType === targetType && item.targetId === targetId
    );

    if (!containment) {
      return {
        eligible: true,
        status: "healthy",
        reasonCodes: ["NO_ACTIVE_CONTAINMENT"],
        containment: null,
      };
    }

    const status = toStatus(containment.status);
    const blocked = BLOCKING_STATUSES.includes(status);
    return {
      eligible: !blocked,
      status,
      reasonCodes: blocked ? ["TARGET_CONTAINED", `TARGET_STATUS_${status.toUpperCase()}`] : ["TARGET_NOT_BLOCKED"],
      containment,
    };
  } catch {
    return {
      eligible: true,
      status: "healthy",
      reasonCodes: ["CONTAINMENT_STATE_NOT_FOUND"],
      containment: null,
    };
  }
}

export function createContainmentTargetKey(targetType: RuntimeContainmentTargetType, targetId: string): string {
  return `${targetType}:${targetId}`;
}
