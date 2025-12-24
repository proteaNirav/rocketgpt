"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../../lib/supabase"; // relative to /app/super/proposals/page.tsx
import { ManualReviewButton } from "../../../components/ManualReviewButton";

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬
// Types (local, minimal and compatible with your DB schema)
// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬
type ProposalStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "in_progress"
  | "applied"
  | "failed"
  | "implemented"
  | "queued";

type ProposalRow = {
  id: string;
  title: string;
  description: string | null;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  // Ã°Å¸"˜"¡ this is the column we added earlier in the SQL
  last_self_apply_job_id: string | null;
};

// For lightweight UI state
type BusyMap = Record<string, boolean>;

// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬
// Page Component
// Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬Ã¢"â‚¬
export default function SuperProposalsPage() {
  const sb = useMemo(() => getSupabase(), []);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusyMap>({});
  const [error, setError] = useState<string | null>(null);

  // Load proposals (only the fields we need)
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await sb
        .from("proposals")
        .select(
          "id,title,description,status,created_at,updated_at,approved_by,approved_at,last_self_apply_job_id"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProposals((data || []) as ProposalRow[]);
    } catch (e: any) {
      setError(e.message || "Failed to load proposals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update proposal status
  async function setStatus(id: string, status: ProposalStatus) {
    setBusy((m) => ({ ...m, [id]: true }));
    setError(null);
    try {
      const patch: Partial<ProposalRow> = { status };
      // If approving, stamp approved_at (approved_by can be null in SQL editor context)
      if (status === "approved") {
          (patch as any).approved_at = new Date().toISOString();
      }
      const { error } = await sb
        .from("proposals")
        .update(patch)
        .eq("id", id);
      if (error) throw error;

      // Refresh to reflect trigger updates (e.g., last_self_apply_job_id)
      await load();
    } catch (e: any) {
      setError(e.message || "Failed to update status");
    } finally {
      setBusy((m) => ({ ...m, [id]: false }));
    }
  }

  return (
    <div className="p-5">
      <div className="mb-5">
                <h1 className="text-2xl font-semibold">Superuser - Proposals</h1>
        <p className="text-sm text-gray-600">
          Approve proposals to enqueue Self-Apply. Manual Review button appears when a job is created.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
                <div className="text-sm text-gray-600">Loading Proposals…</div>

      ) : proposals.length === 0 ? (
        <div className="text-sm text-gray-600">No proposals yet.</div>
      ) : (
        <div className="grid gap-4">
          {proposals.map((p) => {
            const isBusy = !!busy[p.id];
            return (
              <div
                key={p.id}
                className="rounded-lg border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-medium">{p.title}</h3>
                    <div className="mt-1 text-xs text-gray-600">
                      <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5">
                        Status: <strong className="ml-1">{p.status}</strong>
                      </span>
                      {p.last_self_apply_job_id && (
                        <span className="ml-2 inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                           Job: {p.last_self_apply_job_id.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="mt-2 text-sm text-gray-700">{p.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => setStatus(p.id, "under_review")}
                    disabled={isBusy}
                  >
                    Mark Under Review
                  </button>
                  <button
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => setStatus(p.id, "approved")}
                    disabled={isBusy}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => setStatus(p.id, "rejected")}
                    disabled={isBusy}
                  >
                    Reject
                  </button>
                  <button
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => setStatus(p.id, "implemented")}
                    disabled={isBusy}
                  >
                    Implemented
                  </button>
                  <button
                    className="rounded border px-3 py-1 text-sm"
                    onClick={() => setStatus(p.id, "queued")}
                    disabled={isBusy}
                  >
                    Back to Queue
                  </button>

                 {!!p.last_self_apply_job_id && (
                    <ManualReviewButton
                    jobId={p.last_self_apply_job_id}
                    proposalId={p.id}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


