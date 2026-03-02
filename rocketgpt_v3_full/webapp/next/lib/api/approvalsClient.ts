"use client";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_requested";

export type ApprovalPriority = "low" | "normal" | "high" | "critical" | string;
export type ApprovalRiskLevel = "low" | "medium" | "high" | "unknown" | string;

export type ApprovalDto = {
  id: number;
  request_type: string;
  request_title: string;
  status: ApprovalStatus;
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

export type ListApprovalsParams = {
  status?: ApprovalStatus;
  priority?: ApprovalPriority;
  risk_level?: ApprovalRiskLevel;
  q?: string;
  limit?: number;
  offset?: number;
};

export type ListApprovalsResult = {
  items: ApprovalDto[];
  total: number;
  limit: number;
  offset: number;
};

export type CreateApprovalPayload = {
  request_type: string;
  request_title: string;
  payload: unknown;
  priority?: string;
  risk_level?: string;
  channel?: string;
  actor?: string;
  requested_by?: string;
};

export type ReviewApprovalPayload = {
  reviewer: string;
  approval_notes?: string;
};

class ApprovalsClientError extends Error {
  status: number;
  detail?: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApprovalsClientError";
    this.status = status;
    this.detail = detail;
  }
}

function toApiStatus(status?: ApprovalStatus): string | undefined {
  if (!status) return undefined;
  return status === "rejected" ? "blocked" : status;
}

function toUiStatus(status: unknown): ApprovalStatus {
  if (status === "blocked") return "rejected";
  if (
    status === "pending" ||
    status === "approved" ||
    status === "rejected" ||
    status === "changes_requested"
  ) {
    return status;
  }
  return "pending";
}

function normalizeApproval(raw: any): ApprovalDto {
  return {
    id: Number(raw?.id),
    request_type: String(raw?.request_type ?? ""),
    request_title: String(raw?.request_title ?? ""),
    status: toUiStatus(raw?.status),
    priority: raw?.priority ?? null,
    risk_level: raw?.risk_level ?? null,
    requested_at: String(raw?.requested_at ?? ""),
    requested_by: raw?.requested_by ?? null,
    reviewer: raw?.reviewer ?? null,
    approval_notes: raw?.approval_notes ?? null,
    approved_at: raw?.approved_at ?? null,
    rejected_at: raw?.rejected_at ?? null,
    created_at: String(raw?.created_at ?? ""),
    updated_at: String(raw?.updated_at ?? ""),
    payload: raw?.payload ?? null,
  };
}

async function parseErrorMessage(res: Response): Promise<{ message: string; detail?: unknown }> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (data && typeof data === "object") {
    const message =
      (typeof data.error === "string" && data.error) ||
      (typeof data.message === "string" && data.message) ||
      `Request failed (${res.status})`;
    return { message, detail: data };
  }

  return { message: `Request failed (${res.status})` };
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const { message, detail } = await parseErrorMessage(res);
    throw new ApprovalsClientError(message, res.status, detail);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApprovalsClientError("Invalid JSON response from approvals API.", res.status);
  }
}

function normalizeQuery(value?: string): string | undefined {
  const next = value?.trim();
  return next ? next.toLowerCase() : undefined;
}

function matchesFilters(item: ApprovalDto, params: ListApprovalsParams): boolean {
  if (params.priority && item.priority !== params.priority) return false;
  if (params.risk_level && item.risk_level !== params.risk_level) return false;

  const query = normalizeQuery(params.q);
  if (!query) return true;

  const haystack = [
    item.request_title,
    item.request_type,
    item.requested_by ?? "",
    item.reviewer ?? "",
    item.approval_notes ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export async function listApprovals(params: ListApprovalsParams = {}): Promise<ListApprovalsResult> {
  const limit = Math.max(1, Math.min(params.limit ?? 20, 100));
  const offset = Math.max(0, params.offset ?? 0);
  const page = Math.floor(offset / limit) + 1;

  const search = new URLSearchParams();
  search.set("page", String(page));
  search.set("pageSize", String(limit));
  const status = toApiStatus(params.status);
  if (status) {
    search.set("status", status);
  }

  const raw = await requestJson<{
    items?: any[];
    total?: number;
    page?: number;
    pageSize?: number;
  }>(`/api/approvals?${search.toString()}`);

  const normalized = (raw.items ?? []).map(normalizeApproval).filter((item) => matchesFilters(item, params));
  return {
    items: normalized,
    total: Number(raw.total ?? normalized.length),
    limit,
    offset,
  };
}

export async function getApproval(id: number): Promise<ApprovalDto> {
  const raw = await requestJson<any>(`/api/approvals/${id}`);
  return normalizeApproval(raw);
}

export async function createApproval(payload: CreateApprovalPayload): Promise<ApprovalDto> {
  const raw = await requestJson<any>("/api/approvals", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeApproval(raw);
}

export async function approveApproval(
  id: number,
  payload: ReviewApprovalPayload
): Promise<ApprovalDto> {
  const raw = await requestJson<any>(`/api/approvals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeApproval(raw);
}

export async function blockApproval(id: number, payload: ReviewApprovalPayload): Promise<ApprovalDto> {
  const raw = await requestJson<any>(`/api/approvals/${id}/block`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeApproval(raw);
}

export async function requestChanges(
  id: number,
  payload: ReviewApprovalPayload
): Promise<ApprovalDto> {
  const raw = await requestJson<any>(`/api/approvals/${id}/request-changes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeApproval(raw);
}

export { ApprovalsClientError };
