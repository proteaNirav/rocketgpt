/**
 * lib/approvals-db.ts
 * -----------------------------------------------------------------------------
 * RocketGPT V9 – Approval Orchestration Hub (AOH)
 * DEV IMPLEMENTATION: In-memory store (no external DB).
 *
 * This implementation is suitable for:
 *   - Local development
 *   - Wiring tests (API + PowerShell + approval flows)
 *
 * It can later be replaced with a real DB-backed implementation (Postgres,
 * Supabase, etc.) without changing callers, as long as the exported functions
 * keep the same signatures.
 * -----------------------------------------------------------------------------
 */

import type {
  ApprovalRecord,
  ApprovalEventRecord,
  ApprovalEventType,
  CreateApprovalInput,
  CreateApprovalResult,
  UpdateApprovalStatusInput,
  UpdateApprovalStatusResult,
  ListApprovalsFilter,
  ApprovalStatus,
} from "./approvals";

// -----------------------------------------------------------------------------
// In-memory stores (process-local, resets on server restart)
// -----------------------------------------------------------------------------

let approvalIdCounter = 1;
const approvalsStore = new Map<number, ApprovalRecord>();
const eventsStore: ApprovalEventRecord[] = [];

// -----------------------------------------------------------------------------
// Helper: now() ISO string
// -----------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

// -----------------------------------------------------------------------------
// Helper: filter approvals by ListApprovalsFilter
// -----------------------------------------------------------------------------

function matchesFilter(
  approval: ApprovalRecord,
  filter?: ListApprovalsFilter
): boolean {
  if (!filter) return true;

  if (filter.status) {
    if (Array.isArray(filter.status)) {
      if (!filter.status.includes(approval.status)) return false;
    } else if (approval.status !== filter.status) {
      return false;
    }
  }

  if (filter.request_type) {
    if (Array.isArray(filter.request_type)) {
      if (!filter.request_type.includes(approval.request_type)) return false;
    } else if (approval.request_type !== filter.request_type) {
      return false;
    }
  }

  if (filter.priority) {
    if (Array.isArray(filter.priority)) {
      if (!filter.priority.includes(approval.priority)) return false;
    } else if (approval.priority !== filter.priority) {
      return false;
    }
  }

  if (filter.risk_level) {
    if (Array.isArray(filter.risk_level)) {
      if (!filter.risk_level.includes(approval.risk_level)) return false;
    } else if (approval.risk_level !== filter.risk_level) {
      return false;
    }
  }

  return true;
}

// -----------------------------------------------------------------------------
// createApproval
// -----------------------------------------------------------------------------

export async function createApproval(
  input: CreateApprovalInput
): Promise<CreateApprovalResult> {
  try {
    const id = approvalIdCounter++;

    const now = nowIso();

    const approval: ApprovalRecord = {
      id,
      request_type: input.request_type,
      request_title: input.request_title,
      payload: input.payload ?? {},

      status: "pending",
      priority: input.priority ?? "normal",
      risk_level: input.risk_level ?? "unknown",

      created_at: now,
      updated_at: now,

      approved_at: null,
      rejected_at: null,

      channel: input.channel ?? "system",
      actor: input.actor ?? "rocketgpt",
      reviewer: null,

      approval_notes: null,
    };

    approvalsStore.set(id, approval);

    await logApprovalEvent(id, "created", {
      source: "createApproval",
    });

    return { success: true, approval };
  } catch (err: any) {
    console.error("[createApproval] Unexpected error (in-memory):", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// -----------------------------------------------------------------------------
// updateApprovalStatus
// -----------------------------------------------------------------------------

export async function updateApprovalStatus(
  input: UpdateApprovalStatusInput
): Promise<UpdateApprovalStatusResult> {
  const { approvalId, status, reviewer, approval_notes } = input;

  if (status !== "approved" && status !== "rejected") {
    return {
      success: false,
      error: "Status must be 'approved' or 'rejected'.",
    };
  }

  try {
    const existing = approvalsStore.get(approvalId);

    if (!existing) {
      return {
        success: false,
        error: `Approval with id ${approvalId} not found.`,
      };
    }

    const now = nowIso();
    const updated: ApprovalRecord = {
      ...existing,
      status,
      reviewer,
      approval_notes: approval_notes ?? existing.approval_notes,
      updated_at: now,
      approved_at: status === "approved" ? now : null,
      rejected_at: status === "rejected" ? now : null,
    };

    approvalsStore.set(approvalId, updated);

    const eventType: ApprovalEventType =
      status === "approved" ? "approved" : "rejected";

    await logApprovalEvent(approvalId, eventType, {
      reviewer,
      approval_notes,
    });

    return { success: true, approval: updated };
  } catch (err: any) {
    console.error("[updateApprovalStatus] Unexpected error (in-memory):", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// -----------------------------------------------------------------------------
// listApprovals
// -----------------------------------------------------------------------------

export async function listApprovals(
  filter?: ListApprovalsFilter
): Promise<ApprovalRecord[]> {
  try {
    const all = Array.from(approvalsStore.values());

    const filtered = all.filter((a) => matchesFilter(a, filter));

    // Sort by created_at desc
    filtered.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return filtered;
  } catch (err: any) {
    console.error("[listApprovals] Unexpected error (in-memory):", err);
    return [];
  }
}

// -----------------------------------------------------------------------------
// logApprovalEvent
// -----------------------------------------------------------------------------

export async function logApprovalEvent(
  approvalId: number,
  eventType: ApprovalEventType,
  eventPayload?: Record<string, unknown>
): Promise<ApprovalEventRecord | null> {
  try {
    const id = eventsStore.length + 1;
    const evt: ApprovalEventRecord = {
      id,
      approval_id: approvalId,
      event_type: eventType,
      event_payload: eventPayload ?? null,
      created_at: nowIso(),
    };

    eventsStore.push(evt);
    return evt;
  } catch (err: any) {
    console.error("[logApprovalEvent] Unexpected error (in-memory):", err);
    return null;
  }
}

