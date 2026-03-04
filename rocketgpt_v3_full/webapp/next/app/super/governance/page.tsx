"use client";

import { useEffect, useState } from "react";

type PolicyRule = {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  action: { level: 1 | 2 | 3; explainTemplate: string };
};

export default function GovernanceAdminPage() {
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [digests, setDigests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");

  async function loadAll() {
    setLoading(true);
    setMessage(null);
    try {
      const commonHeaders = {
        "x-governance-role": "admin",
      };
      const [policyRes, eventRes, taskRes, digestRes] = await Promise.all([
        fetch("/api/governance/policies", { headers: commonHeaders }),
        fetch("/api/governance/containment-events", { headers: commonHeaders }),
        fetch("/api/governance/foresight-tasks?status=open", { headers: commonHeaders }),
        fetch("/api/governance/digests", { headers: commonHeaders }),
      ]);

      const [policyJson, eventJson, taskJson, digestJson] = await Promise.all([
        policyRes.json(),
        eventRes.json(),
        taskRes.json(),
        digestRes.json(),
      ]);
      setPolicies(policyJson.items ?? []);
      setEvents(eventJson.items ?? []);
      setTasks(taskJson.items ?? []);
      setDigests(digestJson.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load governance data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function togglePolicy(rule: PolicyRule) {
    setMessage(null);
    try {
      const res = await fetch("/api/governance/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-governance-role": "admin",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ rule: { ...rule, enabled: !rule.enabled } }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update policy.");
      }
      setMessage(`Updated policy ${rule.id}.`);
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Policy update failed.");
    }
  }

  async function runDigestNow() {
    setMessage(null);
    try {
      const res = await fetch("/api/governance/jobs/weekly-digest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-governance-role": "admin",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to run weekly digest job.");
      }
      setMessage(json.ran ? `Digest generated: ${json.digestId}` : json.reason ?? "Digest not due.");
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Digest trigger failed.");
    }
  }

  return (
    <div className="space-y-4 p-5">
      <h1 className="text-2xl font-semibold">CATS Governance Monitor</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Policies, L2/L3 interventions, foresight tasks, and weekly risk digests.
      </p>

      <div className="rounded border border-gray-200 p-3 dark:border-neutral-700">
        <label className="text-sm">
          Admin token
          <input
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <button
          type="button"
          onClick={() => void runDigestNow()}
          className="mt-2 rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Run Weekly Digest Now
        </button>
      </div>

      {message ? (
        <div className="rounded border border-sky-300 bg-sky-50 p-2 text-sm text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-200">
          {message}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-gray-600">Loading governance data...</div> : null}

      <section className="rounded border border-gray-200 p-3 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">Policy Editor</h2>
        <div className="mt-2 space-y-2">
          {policies.map((rule) => (
            <div key={rule.id} className="rounded border border-gray-200 p-2 dark:border-neutral-800">
              <div className="text-sm font-semibold">{rule.name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {rule.id} · priority {rule.priority} · L{rule.action?.level}
              </div>
              <button
                type="button"
                onClick={() => void togglePolicy(rule)}
                className="mt-2 rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
              >
                {rule.enabled ? "Disable" : "Enable"}
              </button>
            </div>
          ))}
          {policies.length === 0 ? <div className="text-sm text-gray-600">No policy rules found.</div> : null}
        </div>
      </section>

      <section className="rounded border border-gray-200 p-3 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">L2/L3 Events</h2>
        <div className="mt-2 space-y-2">
          {events.slice(0, 20).map((event) => (
            <div key={event.id} className="rounded border border-gray-200 p-2 text-sm dark:border-neutral-800">
              <div className="font-semibold">
                L{event.containment_level} · {event.workflow_id}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">{event.explanation}</div>
            </div>
          ))}
          {events.length === 0 ? <div className="text-sm text-gray-600">No containment events yet.</div> : null}
        </div>
      </section>

      <section className="rounded border border-gray-200 p-3 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">Foresight Tasks</h2>
        <div className="mt-2 space-y-2">
          {tasks.slice(0, 20).map((task) => (
            <div key={task.id} className="rounded border border-gray-200 p-2 text-sm dark:border-neutral-800">
              <div className="font-semibold">{task.summary}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                {task.status} · queues: {(task.domain_queues ?? []).join(", ")}
              </div>
            </div>
          ))}
          {tasks.length === 0 ? <div className="text-sm text-gray-600">No open foresight tasks.</div> : null}
        </div>
      </section>

      <section className="rounded border border-gray-200 p-3 dark:border-neutral-700">
        <h2 className="text-lg font-semibold">Weekly Digest Viewer</h2>
        <div className="mt-2 space-y-2">
          {digests.slice(0, 10).map((digest) => (
            <div key={digest.id} className="rounded border border-gray-200 p-2 text-sm dark:border-neutral-800">
              <div className="font-semibold">
                {digest.week_start} to {digest.week_end}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">
                Patterns: {digest.digest_payload?.topPatterns?.length ?? 0} · L2/L3 events:{" "}
                {digest.digest_payload?.l2l3Events?.length ?? 0}
              </div>
            </div>
          ))}
          {digests.length === 0 ? <div className="text-sm text-gray-600">No digests published yet.</div> : null}
        </div>
      </section>
    </div>
  );
}

