export type ApprovalRisk = "low" | "medium" | "high";

export type ApprovalCategory = "planner" | "builder" | "tester" | "release";

export type ApprovalSuggestedAction =
  | "auto-approve"
  | "reject"
  | "revise"
  | "ask-human";

export interface ApprovalPacket {
  /** Unique ID for this approval request (per step). */
  requestId: string;

  /** Orchestrator run identifier. */
  runId: string;

  /** Step number within the run (1-based). */
  step: number;

  /** Which stage emitted this packet. */
  category: ApprovalCategory;

  /** Computed risk level after rules are applied. */
  risk: ApprovalRisk;

  /** Whether a human must be involved before proceeding. */
  requiresHuman: boolean;

  /** Machine-readable reasons explaining risk/decision. */
  reasons: string[];

  /** Hints for UI and logs (how to improve / what to check). */
  hints: string[];

  /**
   * Free-form payload from Planner/Builder/Tester.
   * Should be JSON-serializable and stable for logging.
   */
  payload: Record<string, any>;

  /** Engine’s recommended next action. */
  suggestedAction: ApprovalSuggestedAction;
}

/**
 * Minimal input shape accepted by helpers – used before
 * final normalization into ApprovalPacket.
 */
export interface ApprovalInput {
  requestId: string;
  runId: string;
  step: number;
  category: ApprovalCategory;
  payload?: Record<string, any>;

  risk?: ApprovalRisk;
  requiresHuman?: boolean;
  reasons?: string[] | string;
  hints?: string[] | string;
  suggestedAction?: ApprovalSuggestedAction;
}

/** Result of applying deterministic rules. */
export interface RuleEvaluationResult {
  risk: ApprovalRisk;
  reasons: string[];
  hints: string[];
}

/** Utility: ensure any string|string[] becomes a clean string[]. */
function toStringArray(value?: string | string[]): string[] {
  if (!value) return [];
  return Array.isArray(value)
    ? value.filter((v) => typeof v === "string" && v.trim().length > 0)
    : value.trim().length > 0
    ? [value.trim()]
    : [];
}

/** Map risk → suggested action (default opinionated policy). */
export function computeSuggestedAction(risk: ApprovalRisk): ApprovalSuggestedAction {
  switch (risk) {
    case "low":
      return "auto-approve";
    case "medium":
      return "revise";
    case "high":
    default:
      return "ask-human";
  }
}

/**
 * Normalize a loose ApprovalInput into a fully-populated ApprovalPacket.
 * This guarantees:
 *  - arrays are arrays
 *  - risk has a default ("low")
 *  - suggestedAction is consistent with risk (if not explicitly set)
 *  - requiresHuman defaults based on risk
 */
export function normalizeApprovalPacket(input: ApprovalInput): ApprovalPacket {
  const risk: ApprovalRisk = input.risk ?? "low";

  const reasons = toStringArray(input.reasons);
  const hints = toStringArray(input.hints);

  const suggestedAction: ApprovalSuggestedAction =
    input.suggestedAction ?? computeSuggestedAction(risk);

  const requiresHuman =
    typeof input.requiresHuman === "boolean"
      ? input.requiresHuman
      : risk === "high";

  return {
    requestId: input.requestId,
    runId: input.runId,
    step: input.step,
    category: input.category,
    payload: input.payload ?? {},
    risk,
    requiresHuman,
    reasons,
    hints,
    suggestedAction,
  };
}

/**
 * Lightweight validation – returns all detected issues instead of throwing.
 * The evaluator and API layer can use this for defensive checks.
 */
export function validateApprovalPacket(packet: ApprovalPacket): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!packet.requestId || typeof packet.requestId !== "string") {
    errors.push("requestId must be a non-empty string.");
  }
  if (!packet.runId || typeof packet.runId !== "string") {
    errors.push("runId must be a non-empty string.");
  }
  if (
    typeof packet.step !== "number" ||
    !Number.isFinite(packet.step) ||
    packet.step <= 0
  ) {
    errors.push("step must be a positive number.");
  }

  const validCategories: ApprovalCategory[] = [
    "planner",
    "builder",
    "tester",
    "release",
  ];
  if (!validCategories.includes(packet.category)) {
    errors.push(
      "category must be one of: " +
        validCategories.join(", ") +
        ". Received: " +
        packet.category
    );
  }

  const validRisks: ApprovalRisk[] = ["low", "medium", "high"];
  if (!validRisks.includes(packet.risk)) {
    errors.push(
      "risk must be one of: " +
        validRisks.join(", ") +
        ". Received: " +
        packet.risk
    );
  }

  const validActions: ApprovalSuggestedAction[] = [
    "auto-approve",
    "reject",
    "revise",
    "ask-human",
  ];
  if (!validActions.includes(packet.suggestedAction)) {
    errors.push(
      "suggestedAction must be one of: " +
        validActions.join(", ") +
        ". Received: " +
        packet.suggestedAction
    );
  }

  if (!Array.isArray(packet.reasons)) {
    errors.push("reasons must be an array.");
  }
  if (!Array.isArray(packet.hints)) {
    errors.push("hints must be an array.");
  }

  if (typeof packet.payload !== "object" || packet.payload === null) {
    errors.push("payload must be a non-null object.");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

/**
 * Strict variant – throws if the packet is not valid.
 * Useful at API boundaries or critical pipeline junctions.
 */
export function assertValidApprovalPacket(packet: ApprovalPacket): void {
  const result = validateApprovalPacket(packet);
  if (!result.ok) {
    throw new Error(
      "Invalid ApprovalPacket: " + result.errors.join(" | ")
    );
  }
}
