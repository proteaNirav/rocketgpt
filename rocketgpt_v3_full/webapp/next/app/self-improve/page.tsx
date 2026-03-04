"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Finding = {
  id: string;
  type: string;
  severity: string;
  summary: string;
  evidence_refs: string[];
};

type ProposalRow = {
  proposal: {
    proposal_id: string;
    finding: { summary: string; type: string; severity: string; evidence_refs: string[] };
    plan: { scope: { allowed_paths: string[]; disallowed_paths: string[]; max_files_changed: number }; changes: Array<{ kind: string; path: string; rationale: string }> };
    verification: { required_checks: string[] };
    approvals: { requires_human: boolean; auto_merge_allowed: boolean };
  };
  status: string;
  meta?: Record<string, unknown>;
};

async function readJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export default function SelfImprovePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<string>("");
  const [confirmExecute, setConfirmExecute] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, p] = await Promise.all([readJson("/api/self-improve/findings"), readJson("/api/self-improve/proposals")]);
      setFindings(f.findings || []);
      setProposals(p.proposals || []);
      if (!selectedProposalId && p.proposals?.length) {
        setSelectedProposalId(p.proposals[0].proposal.proposal_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load self-improve data");
    } finally {
      setLoading(false);
    }
  }, [selectedProposalId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = useMemo(
    () => proposals.find((p) => p.proposal.proposal_id === selectedProposalId) || null,
    [proposals, selectedProposalId]
  );

  async function runScan() {
    setLoading(true);
    setError(null);
    try {
      await readJson("/api/self-improve/scan", { method: "POST" });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  async function validateProposal() {
    if (!selectedProposalId) return;
    setLoading(true);
    setError(null);
    try {
      await readJson("/api/self-improve/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposal_id: selectedProposalId }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validate failed");
    } finally {
      setLoading(false);
    }
  }

  async function executeProposal() {
    if (!selectedProposalId) return;
    if (!confirmExecute) {
      setError("Please confirm 'I understand' before execution.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await readJson("/api/self-improve/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proposal_id: selectedProposalId, confirmed: true, dry_run: dryRun }),
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Execute failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Self-Improve</h1>
      <p className="text-sm text-slate-300">
        Detects CI/policy/replay issues, drafts bounded proposals, and executes via governed PR flow.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded border px-3 py-2 text-sm" onClick={runScan} disabled={loading}>
          Run Scan
        </button>
        <button className="rounded border px-3 py-2 text-sm" onClick={validateProposal} disabled={loading || !selectedProposalId}>
          Validate Proposal
        </button>
        <button className="rounded border px-3 py-2 text-sm" onClick={executeProposal} disabled={loading || !selectedProposalId}>
          Create Fix PR
        </button>
        <label className="text-sm">
          <input type="checkbox" className="mr-2" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry-run
        </label>
        <label className="text-sm">
          <input type="checkbox" className="mr-2" checked={confirmExecute} onChange={(e) => setConfirmExecute(e.target.checked)} />
          I understand
        </label>
      </div>

      {error ? <div className="rounded border border-red-500 bg-red-950/40 p-3 text-sm text-red-200">{error}</div> : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded border p-4">
          <h2 className="font-medium mb-2">Findings</h2>
          {loading ? <p className="text-sm text-slate-400">Loading...</p> : null}
          <ul className="space-y-2">
            {findings.map((f) => (
              <li key={f.id} className="rounded border p-2 text-sm">
                <div className="font-medium">{f.id} · {f.type} · {f.severity}</div>
                <div className="text-slate-300">{f.summary}</div>
              </li>
            ))}
            {!findings.length ? <li className="text-sm text-slate-400">No findings.</li> : null}
          </ul>
        </div>

        <div className="rounded border p-4">
          <h2 className="font-medium mb-2">Proposals</h2>
          <div className="space-y-2">
            {proposals.map((row) => (
              <button
                key={row.proposal.proposal_id}
                className={`w-full text-left rounded border p-2 text-sm ${selectedProposalId === row.proposal.proposal_id ? "border-slate-100" : "border-slate-700"}`}
                onClick={() => setSelectedProposalId(row.proposal.proposal_id)}
              >
                <div className="font-medium">{row.proposal.proposal_id}</div>
                <div className="text-slate-300">{row.proposal.finding.summary}</div>
                <div className="text-xs text-slate-400">status: {row.status}</div>
              </button>
            ))}
            {!proposals.length ? <p className="text-sm text-slate-400">No proposals.</p> : null}
          </div>
        </div>
      </section>

      {selected ? (
        <section className="rounded border p-4 text-sm space-y-2">
          <h3 className="font-medium">Proposal Details: {selected.proposal.proposal_id}</h3>
          <p>Finding: {selected.proposal.finding.type} ({selected.proposal.finding.severity})</p>
          <p>Allowed paths: {selected.proposal.plan.scope.allowed_paths.join(", ")}</p>
          <p>Disallowed paths: {selected.proposal.plan.scope.disallowed_paths.join(", ")}</p>
          <p>Max files changed: {selected.proposal.plan.scope.max_files_changed}</p>
          <p>Checks: {selected.proposal.verification.required_checks.join(", ")}</p>
          <p>Evidence: {selected.proposal.finding.evidence_refs.join(", ") || "None"}</p>
          <ul className="list-disc pl-6">
            {selected.proposal.plan.changes.map((c, idx) => (
              <li key={`${c.path}-${idx}`}>
                {c.kind}: {c.path} ({c.rationale})
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
