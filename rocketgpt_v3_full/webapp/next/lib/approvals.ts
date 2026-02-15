// lib/approvals.ts
// -----------------------------------------------------------------------------
// RocketGPT V9 – Approval Orchestration Hub (AOH)
// Core TypeScript types and helper interfaces used across API, UI, and tooling.
// -----------------------------------------------------------------------------
// This file is *purely* types and structures. No DB queries or side effects.
// -----------------------------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export type ApprovalPriority = 'low' | 'normal' | 'high' | 'critical'

export type ApprovalRiskLevel = 'low' | 'medium' | 'high' | 'unknown'

export type ApprovalChannel =
  | 'chat'
  | 'ui'
  | 'email'
  | 'github'
  | 'whatsapp'
  | 'powershell'
  | 'system'

/**
 * High-level category of what is being approved.
 * This can help the Adaptive Governance Engine (AGE) pick Mode A/B/C/D.
 */
export type ApprovalRequestType =
  | 'code-change'
  | 'config-change'
  | 'workflow-change'
  | 'strategy'
  | 'simulation-result'
  | 'r-and-d'
  | 'multi-project-impact'
  | 'other'

/**
 * Core Approval record – mirrors the `approvals` table schema.
 */
export interface ApprovalRecord {
  id: number

  request_type: ApprovalRequestType
  request_title: string
  payload: Record<string, unknown>

  status: ApprovalStatus
  priority: ApprovalPriority
  risk_level: ApprovalRiskLevel

  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp

  approved_at: string | null
  rejected_at: string | null

  channel: ApprovalChannel | null
  actor: string | null
  reviewer: string | null

  approval_notes: string | null
}

/**
 * Input shape when RocketGPT creates a new approval request.
 * `status`, timestamps, and id are assigned by the backend.
 */
export interface CreateApprovalInput {
  request_type: ApprovalRequestType
  request_title: string
  payload: Record<string, unknown>

  priority?: ApprovalPriority
  risk_level?: ApprovalRiskLevel

  channel?: ApprovalChannel
  actor?: string
}

/**
 * Result returned after creating a new approval.
 */
export interface CreateApprovalResult {
  success: boolean
  approval?: ApprovalRecord
  error?: string
}

/**
 * Input for approving or rejecting an approval.
 */
export interface UpdateApprovalStatusInput {
  approvalId: number
  status: Extract<ApprovalStatus, 'approved' | 'rejected'>
  reviewer: string // e.g. "nirav" or an email / user id
  approval_notes?: string
}

/**
 * Result returned after updating approval status.
 */
export interface UpdateApprovalStatusResult {
  success: boolean
  approval?: ApprovalRecord
  error?: string
}

/**
 * Filter options when listing approvals (e.g., for the Approval Center UI).
 */
export interface ListApprovalsFilter {
  status?: ApprovalStatus | ApprovalStatus[]
  request_type?: ApprovalRequestType | ApprovalRequestType[]
  priority?: ApprovalPriority | ApprovalPriority[]
  risk_level?: ApprovalRiskLevel | ApprovalRiskLevel[]
}

/**
 * Basic approval event type – mirrors the `approval_events` table.
 */
export type ApprovalEventType =
  | 'created'
  | 'approved'
  | 'rejected'
  | 'reminder'
  | 'email-sent'
  | 'whatsapp-sent'
  | 'github-pr-created'
  | 'simulation-run'
  | 'other'

export interface ApprovalEventRecord {
  id: number
  approval_id: number
  event_type: ApprovalEventType
  event_payload: Record<string, unknown> | null
  created_at: string // ISO timestamp
}

/**
 * Convenience type for the minimal payload needed to send an email / WhatsApp
 * approval request. The full `payload` can carry much more detail.
 */
export interface ApprovalNotificationPayload {
  approvalId: number
  title: string
  summary: string
  risk_level: ApprovalRiskLevel
  priority: ApprovalPriority
  // Optional pre-rendered information blocks (diff, rationale, etc.)
  details?: string
  // Links for Approve / Reject / View in UI
  approveUrl?: string
  rejectUrl?: string
  viewUrl?: string
}
