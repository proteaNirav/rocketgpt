import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const APPROVALS_TABLE = "approvals";

const APPROVAL_SELECT_COLUMNS = [
  "id",
  "request_type",
  "request_title",
  "status",
  "priority",
  "risk_level",
  "requested_at",
  "requested_by",
  "reviewer",
  "approval_notes",
  "approved_at",
  "rejected_at",
  "created_at",
  "updated_at",
  "payload",
].join(", ");

export type ApprovalRecord = {
  id: number;
  request_type: string;
  request_title: string;
  status: string;
  priority: string | null;
  risk_level: string | null;
  requested_at: string;
  requested_by: string | null;
  reviewer: string | null;
  approval_notes: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  payload: unknown;
};

export type ListApprovalsInput = {
  status?: string;
  page?: number;
  pageSize?: number;
};

export type ListApprovalsResult = {
  items: ApprovalRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type SubmitApprovalInput = {
  request_type: string;
  request_title: string;
  payload: unknown;
  priority?: string | null;
  risk_level?: string | null;
  channel?: string | null;
  actor?: string | null;
  requested_by?: string | null;
};

export type ReviewApprovalInput = {
  reviewer: string;
  approval_notes?: string | null;
};

let supabaseAdminClient: SupabaseClient | null = null;

function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase server credentials.");
  }

  supabaseAdminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminClient;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mapApprovalRow(row: any): ApprovalRecord {
  return {
    id: Number(row.id),
    request_type: row.request_type,
    request_title: row.request_title,
    status: row.status,
    priority: row.priority ?? null,
    risk_level: row.risk_level ?? null,
    requested_at: row.requested_at,
    requested_by: row.requested_by ?? null,
    reviewer: row.reviewer ?? null,
    approval_notes: row.approval_notes ?? null,
    approved_at: row.approved_at ?? null,
    rejected_at: row.rejected_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    payload: row.payload,
  };
}

export async function listApprovals(input: ListApprovalsInput): Promise<ListApprovalsResult> {
  const supabase = getSupabaseAdminClient();
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(APPROVALS_TABLE)
    .select(APPROVAL_SELECT_COLUMNS, { count: "exact" })
    .order("requested_at", { ascending: false })
    .range(from, to);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    items: (data ?? []).map(mapApprovalRow),
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getApproval(id: number): Promise<ApprovalRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(APPROVALS_TABLE)
    .select(APPROVAL_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapApprovalRow(data) : null;
}

export async function submitApproval(input: SubmitApprovalInput): Promise<ApprovalRecord> {
  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = {
    request_type: input.request_type,
    request_title: input.request_title,
    payload: input.payload,
  };

  if (input.priority !== undefined) {
    payload.priority = input.priority;
  }
  if (input.risk_level !== undefined) {
    payload.risk_level = input.risk_level;
  }
  if (input.channel !== undefined) {
    payload.channel = input.channel;
  }
  if (input.actor !== undefined) {
    payload.actor = input.actor;
  }
  if (input.requested_by !== undefined) {
    payload.requested_by = input.requested_by;
  }

  const { data, error } = await supabase
    .from(APPROVALS_TABLE)
    .insert(payload)
    .select(APPROVAL_SELECT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapApprovalRow(data);
}

export async function approveApproval(
  id: number,
  input: ReviewApprovalInput
): Promise<ApprovalRecord | null> {
  const supabase = getSupabaseAdminClient();
  const now = nowIso();

  const { data, error } = await supabase
    .from(APPROVALS_TABLE)
    .update({
      status: "approved",
      approved_at: now,
      rejected_at: null,
      reviewer: input.reviewer,
      approval_notes: input.approval_notes ?? null,
      updated_at: now,
    })
    .eq("id", id)
    .select(APPROVAL_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapApprovalRow(data) : null;
}

export async function blockApproval(
  id: number,
  input: ReviewApprovalInput
): Promise<ApprovalRecord | null> {
  const supabase = getSupabaseAdminClient();
  const now = nowIso();

  const { data, error } = await supabase
    .from(APPROVALS_TABLE)
    .update({
      status: "blocked",
      rejected_at: now,
      approved_at: null,
      reviewer: input.reviewer,
      approval_notes: input.approval_notes ?? null,
      updated_at: now,
    })
    .eq("id", id)
    .select(APPROVAL_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapApprovalRow(data) : null;
}

export async function requestChanges(
  id: number,
  input: ReviewApprovalInput
): Promise<ApprovalRecord | null> {
  const supabase = getSupabaseAdminClient();
  const now = nowIso();

  const { data, error } = await supabase
    .from(APPROVALS_TABLE)
    .update({
      status: "changes_requested",
      reviewer: input.reviewer,
      approval_notes: input.approval_notes ?? null,
      updated_at: now,
    })
    .eq("id", id)
    .select(APPROVAL_SELECT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapApprovalRow(data) : null;
}
