"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  approveApproval,
  ApprovalDto,
  ApprovalStatus,
  blockApproval,
  createApproval,
  getApproval,
  listApprovals,
  requestChanges,
} from "@/lib/api/approvalsClient";

type Props = {
  demoMode: boolean;
};

type Toast = {
  id: string;
  level: "success" | "error";
  message: string;
};

const LIMIT = 10;

const STATUS_OPTIONS: Array<"all" | ApprovalStatus> = [
  "all",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
];

function statusPillClass(status: ApprovalStatus): string {
  if (status === "approved") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200";
  }
  if (status === "rejected") {
    return "border-red-300 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200";
  }
  if (status === "changes_requested") {
    return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200";
  }
  return "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-200";
}

function statusLabel(status: ApprovalStatus): string {
  if (status === "changes_requested") return "changes requested";
  return status;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString();
}

export default function CatsApprovalsInbox({ demoMode }: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | ApprovalStatus>("all");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState<ApprovalDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ApprovalDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [reviewer, setReviewer] = useState("demo.reviewer@rocketgpt.local");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<"approve" | "block" | "request-changes" | null>(null);
  const [creatingTest, setCreatingTest] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);

  const canPrev = offset > 0;
  const canNext = offset + LIMIT < total;
  const pageLabel = `${Math.floor(offset / LIMIT) + 1}`;

  const selectedStatusParam = useMemo(
    () => (statusFilter === "all" ? undefined : statusFilter),
    [statusFilter]
  );

  const pushToast = useCallback((level: Toast["level"], message: string) => {
    const toast: Toast = { id: `t-${Date.now()}-${Math.random()}`, level, message };
    setToasts((current) => [toast, ...current].slice(0, 3));
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 2800);
  }, []);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const result = await listApprovals({
        status: selectedStatusParam,
        q: query,
        limit: LIMIT,
        offset,
      });
      setItems(result.items);
      setTotal(result.total);

      if (result.items.length === 0) {
        setSelectedId(null);
        setDetail(null);
      } else if (!selectedId || !result.items.some((item) => item.id === selectedId)) {
        setSelectedId(result.items[0].id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load approvals.";
      setListError(message);
      setItems([]);
      setTotal(0);
      setSelectedId(null);
      setDetail(null);
    } finally {
      setLoadingList(false);
    }
  }, [offset, query, selectedId, selectedStatusParam]);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const result = await getApproval(id);
      setDetail(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load approval detail.";
      setDetailError(message);
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    }
  }, [loadDetail, selectedId]);

  async function runReviewAction(action: "approve" | "block" | "request-changes"): Promise<void> {
    if (!detail) return;
    if (!reviewer.trim()) {
      pushToast("error", "Reviewer is required.");
      return;
    }

    setActionLoading(action);
    try {
      if (action === "approve") {
        await approveApproval(detail.id, { reviewer: reviewer.trim(), approval_notes: approvalNotes || undefined });
        pushToast("success", "Approval marked as approved.");
      } else if (action === "block") {
        await blockApproval(detail.id, { reviewer: reviewer.trim(), approval_notes: approvalNotes || undefined });
        pushToast("success", "Approval marked as rejected.");
      } else {
        await requestChanges(detail.id, { reviewer: reviewer.trim(), approval_notes: approvalNotes || undefined });
        pushToast("success", "Approval marked as changes requested.");
      }

      await Promise.all([loadList(), loadDetail(detail.id)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review action failed.";
      pushToast("error", message);
    } finally {
      setActionLoading(null);
    }
  }

  async function onCreateTestApproval(): Promise<void> {
    setCreatingTest(true);
    try {
      await createApproval({
        request_type: "release_gate",
        request_title: `Demo approval ${new Date().toISOString()}`,
        priority: "normal",
        risk_level: "medium",
        requested_by: "demo-user",
        payload: {
          source: "cats-approvals-inbox",
          reason: "integration sanity check",
        },
      });
      pushToast("success", "Test approval created.");
      setOffset(0);
      await loadList();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create test approval.";
      pushToast("error", message);
    } finally {
      setCreatingTest(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Approvals / Inbox</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Review and action approval requests from the DB-backed API.
          </p>
        </div>
        {demoMode ? (
          <button
            onClick={onCreateTestApproval}
            disabled={creatingTest}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {creatingTest ? "Creating..." : "Create test approval"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as "all" | ApprovalStatus);
              setOffset(0);
            }}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "all" : statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Search</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
            placeholder="Search title, type, reviewer, notes"
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>
              Page {pageLabel} · total {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setOffset((current) => Math.max(0, current - LIMIT))}
                disabled={!canPrev}
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700"
              >
                Prev
              </button>
              <button
                onClick={() => setOffset((current) => current + LIMIT)}
                disabled={!canNext}
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700"
              >
                Next
              </button>
            </div>
          </div>

          {loadingList ? (
            <div className="rounded border border-gray-200 p-3 text-sm text-gray-600 dark:border-neutral-700 dark:text-gray-300">
              Loading approvals...
            </div>
          ) : listError ? (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              {listError}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded border border-gray-200 p-3 text-sm text-gray-600 dark:border-neutral-700 dark:text-gray-300">
              No approvals found for the current filters.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Priority</th>
                    <th className="px-2 py-2">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`cursor-pointer border-t border-gray-200 dark:border-neutral-700 ${
                        selectedId === item.id ? "bg-gray-100 dark:bg-neutral-800/50" : "hover:bg-gray-50 dark:hover:bg-neutral-800/30"
                      }`}
                    >
                      <td className="px-2 py-2">{item.id}</td>
                      <td className="px-2 py-2">{item.request_title}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusPillClass(item.status)}`}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-2 py-2">{item.priority ?? "-"}</td>
                      <td className="px-2 py-2">{formatDate(item.requested_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Review</h2>
          {loadingDetail ? (
            <div className="mt-2 rounded border border-gray-200 p-3 text-sm text-gray-600 dark:border-neutral-700 dark:text-gray-300">
              Loading detail...
            </div>
          ) : detailError ? (
            <div className="mt-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300">
              {detailError}
            </div>
          ) : !detail ? (
            <div className="mt-2 rounded border border-gray-200 p-3 text-sm text-gray-600 dark:border-neutral-700 dark:text-gray-300">
              Select an approval from the inbox.
            </div>
          ) : (
            <div className="mt-2 space-y-3 text-sm">
              <div className="rounded border border-gray-200 p-3 dark:border-neutral-700">
                <div className="font-semibold">{detail.request_title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">#{detail.id} · {detail.request_type}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 ${statusPillClass(detail.status)}`}>
                    {statusLabel(detail.status)}
                  </span>
                  <span className="rounded-full border border-gray-300 px-2 py-0.5 dark:border-neutral-700">
                    priority: {detail.priority ?? "-"}
                  </span>
                  <span className="rounded-full border border-gray-300 px-2 py-0.5 dark:border-neutral-700">
                    risk: {detail.risk_level ?? "-"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                  Requested by: {detail.requested_by ?? "-"} · Requested at: {formatDate(detail.requested_at)}
                </div>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Reviewer</span>
                <input
                  value={reviewer}
                  onChange={(event) => setReviewer(event.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Approval notes</span>
                <textarea
                  value={approvalNotes}
                  onChange={(event) => setApprovalNotes(event.target.value)}
                  className="h-24 w-full rounded border border-gray-300 px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void runReviewAction("approve")}
                  disabled={actionLoading !== null}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === "approve" ? "Approving..." : "Approve"}
                </button>
                <button
                  onClick={() => void runReviewAction("block")}
                  disabled={actionLoading !== null}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === "block" ? "Blocking..." : "Block"}
                </button>
                <button
                  onClick={() => void runReviewAction("request-changes")}
                  disabled={actionLoading !== null}
                  className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                  {actionLoading === "request-changes" ? "Submitting..." : "Request Changes"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {toasts.length ? (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded border px-3 py-2 text-sm shadow ${
                toast.level === "success"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-red-300 bg-red-50 text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
