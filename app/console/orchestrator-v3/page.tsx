"use client";

import React, { useState } from "react";

type AutoAdvanceResponse = {
  success: boolean;
  runId: number;
  phase: string | null;
  phaseResult: any;
};

type StartRunResponse = {
  success: boolean;
  runId: number;
};

type RunStatusResponse = {
  success: boolean;
  runId: number;
  status: string;
};

export default function OrchestratorV3Page() {
  const [goalTitle, setGoalTitle] = useState("Test Run via Orchestrator V3");
  const [goalDescription, setGoalDescription] = useState(
    "Testing Planner \u2192 Builder \u2192 Tester via auto-advance."
  );

  const [runId, setRunId] = useState<number | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const [lastPhase, setLastPhase] = useState<string | null>(null);
  const [lastPhaseResult, setLastPhaseResult] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  async function fetchRunStatus(id: number) {
    try {
      const res = await fetch(`/api/orchestrator/run/status?runId=${id}`);
      if (!res.ok) return;
      const data: RunStatusResponse | { success: false } = await res.json();
      // @ts-expect-error narrow success shape
      if ((data as any).success && (data as RunStatusResponse).status) {
        setRunStatus((data as RunStatusResponse).status);
      }
    } catch {
      // ignore status fetch errors for now
    }
  }

  async function handleStartRun() {
    setStatusMessage("");
    setLastPhase(null);
    setLastPhaseResult(null);
    setLogs([]);
    setIsBusy(true);
    setRunStatus(null);

    try {
      const res = await fetch("/api/orchestrator/start-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_title: goalTitle,
          goal_description: goalDescription,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Start-run failed: ${res.status} ${text}`);
      }

      const data: StartRunResponse = await res.json();
      if (!data.success) {
        throw new Error("Start-run returned success=false.");
      }

      setRunId(data.runId);
      setRunStatus("pending");
      setStatusMessage(`Run started with ID ${data.runId}.`);
      setLogs((prev) => [
        `Run ${data.runId} started (status: pending).`,
        ...prev,
      ]);

      fetchRunStatus(data.runId).catch(() => {});
    } catch (err: any) {
      setStatusMessage(err?.message ?? "Unknown error starting run.");
      setLogs((prev) => [`[ERROR] ${err?.message ?? String(err)}`, ...prev]);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAutoAdvanceOnce() {
    if (!runId) {
      setStatusMessage("Please start a run first.");
      return;
    }

    setIsBusy(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/orchestrator/auto-advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Auto-advance failed: ${res.status} ${text}`);
      }

      const data: AutoAdvanceResponse = await res.json();

      setLastPhase(data.phase);
      setLastPhaseResult(data.phaseResult);

      const shortPhase = data.phase ?? "noop";
      const logLine = `Run ${data.runId} \u2192 phase=${shortPhase}`;

      setLogs((prev) => [logLine, ...prev]);

      if (shortPhase === "noop") {
        setStatusMessage("No phase executed. Run may be completed or in a running state.");
      } else if (shortPhase === "finalize") {
        setStatusMessage("Run finalized and marked as completed.");
      } else {
        setStatusMessage(`Phase executed: ${shortPhase}`);
      }

      await fetchRunStatus(runId);
    } catch (err: any) {
      setStatusMessage(err?.message ?? "Unknown error in auto-advance.");
      setLogs((prev) => [`[ERROR] ${err?.message ?? String(err)}`, ...prev]);
    } finally {
      setIsBusy(false);
    }
  }

  const statusLabel = runStatus ?? "unknown";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold mb-2">
        Orchestrator V3 Console (Planner \u2192 Builder \u2192 Tester)
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        This page uses the new multi-phase async orchestrator:
        start-run + auto-advance (Planner \u2192 Builder \u2192 Tester).
      </p>

      {/* 1. Start Run */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">1. Define Goal &amp; Start Run</h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Goal Title
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="e.g., Add Dark Mode to Settings UI"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Goal Description
            <textarea
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-background min-h-[80px]"
              value={goalDescription}
              onChange={(e) => setGoalDescription(e.target.value)}
              placeholder="Describe what the orchestrator should plan and build."
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleStartRun}
          disabled={isBusy}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isBusy ? "Working..." : "Start New Run"}
        </button>

        {runId && (
          <p className="text-sm text-muted-foreground">
            Current run ID:{" "}
            <span className="font-mono font-semibold">{runId}</span>
          </p>
        )}
      </section>

      {/* 2. Auto-Advance */}
      <section className="space-y-4 border rounded-lg p-4">
        <h2 className="text-lg font-medium">2. Auto-Advance Pipeline</h2>
        <p className="text-sm text-muted-foreground">
          Each click calls <code>/api/orchestrator/auto-advance</code> once. It
          moves the run through Planner \u2192 Builder (multiple steps) \u2192 Tester \u2192
          Finalize.
        </p>

        <button
          type="button"
          onClick={handleAutoAdvanceOnce}
          disabled={isBusy || !runId}
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isBusy ? "Advancing..." : "Auto-Advance Once"}
        </button>

        {lastPhase && (
          <div className="mt-3 text-sm">
            <div>
              <span className="font-medium">Last phase:</span>{" "}
              <span className="font-mono">{lastPhase}</span>
            </div>
            <div className="mt-2">
              <span className="font-medium">Last phase result (JSON):</span>
              <pre className="mt-1 text-xs bg-muted rounded-md p-2 overflow-auto max-h-64">
                {JSON.stringify(lastPhaseResult, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* 3. Run Status & Log */}
      <section className="space-y-2 border rounded-lg p-4">
        <h2 className="text-lg font-medium">3. Run Status &amp; Log</h2>
        {statusMessage && (
          <p className="text-sm">
            <span className="font-medium">Status:</span> {statusMessage}
          </p>
        )}
        {logs.length > 0 && (
          <div className="mt-2">
            <h3 className="text-sm font-medium mb-1">Recent events</h3>
            <ul className="text-xs font-mono space-y-1 max-h-48 overflow-auto">
              {logs.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 4. Run Status Timeline */}
      <section className="space-y-3 border rounded-lg p-4">
        <h2 className="text-lg font-medium">4. Run Status Timeline</h2>

        <p className="text-sm mb-1">
          Current Status:
          <span className="ml-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-blue-600 text-white">
            {statusLabel}
          </span>
        </p>

        <div className="text-sm font-mono space-y-1">
          <div>
            {statusLabel === "pending" ? "👉" : statusLabel !== "pending" ? "✓" : "•"}{" "}
            pending
          </div>
          <div>
            {["planner_running", "planner_completed", "builder_running", "builder_completed", "tester_running", "tester_completed", "completed"].includes(
              statusLabel,
            )
              ? "👉"
              : "•"}{" "}
            planner
          </div>
          <div>
            {["builder_running", "builder_completed", "tester_running", "tester_completed", "completed"].includes(
              statusLabel,
            )
              ? "👉"
              : "•"}{" "}
            builder
          </div>
          <div>
            {["tester_running", "tester_completed", "completed"].includes(statusLabel)
              ? "👉"
              : "•"}{" "}
            tester
          </div>
          <div>
            {statusLabel === "completed" ? "🎉" : "•"} completed
          </div>
        </div>
      </section>
    </div>
  );
}
