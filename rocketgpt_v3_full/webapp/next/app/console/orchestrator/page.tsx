"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import ErrorBanner from "@/components/ErrorBanner";
import AdvancedDiffViewer from "@/components/AdvancedDiffViewer";

/* ============================================================
   TYPES
   ============================================================ */

type RunStatus = "success" | "failed";

interface RunRecord {
  run_id: string;
  goal_title: string;
  goal_description: string;
  started_at: string;
  completed_at?: string;
  status: RunStatus;
  error?: string;
  plan?: any;
  build?: any;
  test?: any;
  release?: any;
}

/* ============================================================
   REUSABLE RESULT VIEWERS
   ============================================================ */

function BuildResultView({ output }: { output: any }) {
  if (!output) return <p>No build output yet.</p>;
  if (!output.files_changed || output.files_changed.length === 0)
    return <p>No files changed.</p>;

  return (
    <div className="space-y-6">
      {output.files_changed.map((fc: any, idx: number) => (
        <div key={idx} className="border p-4 rounded bg-muted text-sm">
          <p className="font-semibold mb-2">File: {fc.file_path}</p>

          <AdvancedDiffViewer
            oldText={fc.original ?? ""}
            newText={fc.updated ?? ""}
            language="tsx"
          />

          {fc.diff && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">
                Show Raw Diff
              </summary>
              <pre className="bg-black text-white p-2 mt-1 rounded overflow-auto max-h-[250px] text-xs">
                {fc.diff}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function TestResultView({ output }: { output: any }) {
  if (!output) return <p>No test results yet.</p>;
  if (!output.test_results || output.test_results.length === 0)
    return <p>No test results returned.</p>;

  return (
    <div className="space-y-4">
      {output.test_results.map((t: any, idx: number) => (
        <div key={idx} className="border p-3 rounded bg-muted">
          <p className="font-semibold">Test Case: {t.test_case}</p>
          <p>Status: {t.status}</p>
          {t.duration_ms && <p>Duration: {t.duration_ms} ms</p>}
          {t.error && (
            <pre className="bg-red-900 text-white p-2 rounded mt-2 text-xs">
              {t.error}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

function ReleaseResultView({ output }: { output: any }) {
  if (!output) return <p>No release output yet.</p>;

  return (
    <div className="space-y-3">
      <p className="font-semibold">Release ID: {output.release_id}</p>
      <p>Status: {output.status}</p>
      <p>{output.message}</p>

      {output.actions_taken && (
        <ul className="list-disc ml-6 text-sm">
          {output.actions_taken.map((a: string, idx: number) => (
            <li key={idx}>{a}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ArtifactsView({ artifacts }: { artifacts: any[] }) {
  if (!artifacts || artifacts.length === 0)
    return <p>No artifacts available.</p>;

  return (
    <div className="space-y-4">
      {artifacts.map((a: any, idx: number) => (
        <div key={idx} className="border rounded p-3 bg-muted">
          <p className="font-semibold">Artifact #{idx + 1}</p>
          <pre className="bg-black text-white text-xs p-2 rounded overflow-auto max-h-[250px]">
            {JSON.stringify(a, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function OrchestratorConsole() {
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");

  const [planOutput, setPlanOutput] = useState<any>(null);
  const [buildOutput, setBuildOutput] = useState<any>(null);
  const [testOutput, setTestOutput] = useState<any>(null);
  const [releaseOutput, setReleaseOutput] = useState<any>(null);

  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Plan steps & per-step status
  const [planSteps, setPlanSteps] = useState<any[]>([]);
  const [stepStatuses, setStepStatuses] = useState<Record<number, string>>({});

  // Error banner state
  const [error, setError] = useState<string | null>(null);

  // Run history state
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);
  const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null);

  /* ============================================================
     HELPERS
     ============================================================ */

  const addLog = (msg: string) => {
    const timestamp = new Date().toISOString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  const fail = (msg: string) => {
    setError(msg);
    addLog(`ERROR: ${msg}`);
  };

  const clearError = () => setError(null);

  const initStepStatuses = (steps: any[]) => {
    const initial: Record<number, string> = {};
    steps.forEach((s: any) => {
      if (typeof s.step_no === "number") {
        initial[s.step_no] = "pending";
      }
    });
    setStepStatuses(initial);
  };

  const updateStepStatus = (stepNo: number, status: string) => {
    setStepStatuses((prev) => ({
      ...prev,
      [stepNo]: status,
    }));
  };

  const addRunToHistory = (run: RunRecord) => {
    setRunHistory((prev) => {
      const updated = [...prev, run];
      if (updated.length > 0 && selectedRunIndex === null) {
        setSelectedRunIndex(0);
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setRunHistory([]);
    setSelectedRunIndex(null);
    try {
      localStorage.removeItem("rgpt_run_history");
    } catch (err) {
      console.error("Failed to clear run history from localStorage:", err);
    }
  };

  // Download helpers
  const downloadFile = (filename: string, content: string) => {
    try {
      const blob = new Blob([content], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      fail("Download failed. See console for details.");
    }
  };

  const downloadJson = (filename: string, data: any) => {
    const content = JSON.stringify(data, null, 2);
    downloadFile(filename, content);
  };

  const downloadLogs = () => {
    if (!logs || logs.length === 0) return;
    const name = `rocketgpt-orchestrator-logs-${new Date().toISOString()}.txt`;
    downloadFile(name, logs.join("\n"));
  };

  const downloadRunJson = (run: RunRecord) => {
    const idPart = run.run_id || "no-id";
    const name = `rocketgpt-run-${idPart}.json`;
    downloadJson(name, run);
  };

  const downloadAllRunsJson = () => {
    if (!runHistory || runHistory.length === 0) return;
    const name = `rocketgpt-run-history-${new Date().toISOString()}.json`;
    downloadJson(name, runHistory);
  };

  const downloadRunArtifactsJson = (run: RunRecord) => {
    const testArtifacts = Array.isArray(run.test?.artifacts)
      ? run.test.artifacts
      : [];
    const releaseArtifacts = Array.isArray(run.release?.artifacts)
      ? run.release.artifacts
      : [];
    const combined = [...testArtifacts, ...releaseArtifacts];

    if (combined.length === 0) {
      fail("No artifacts found for this run to download.");
      return;
    }

    const idPart = run.run_id || "no-id";
    const name = `rocketgpt-run-${idPart}-artifacts.json`;
    downloadJson(name, combined);
  };

  /* ============================================================
     LOCAL STORAGE (LOAD & SAVE)
     ============================================================ */

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("rgpt_run_history")
          : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRunHistory(parsed);
          if (parsed.length > 0) {
            setSelectedRunIndex(0);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load run history from localStorage:", err);
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "rgpt_run_history",
          JSON.stringify(runHistory)
        );
      }
    } catch (err) {
      console.error("Failed to save run history to localStorage:", err);
    }
  }, [runHistory]);

  /* ============================================================
     API CALLS (Plan / Build / Test / Release)
     ============================================================ */

  const callPlanAPI = async () => {
    clearError();
    addLog("Calling Planner API...");

    const res = await fetch("/api/orchestrator/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal_title: goalTitle,
        goal_description: goalDescription,
      }),
    });

    const data = await res.json();
    setPlanOutput(data);

    if (!data.success) {
      fail("Planner failed to generate plan.");
      return data;
    }

    const steps = Array.isArray(data.steps) ? data.steps : [];
    setPlanSteps(steps);
    initStepStatuses(steps);

    addLog("✔ Plan generated with " + steps.length + " steps.");
    return data;
  };

  const callBuildAPI = async () => {
    clearError();
    if (!planOutput?.steps) {
      fail("Build aborted: No plan available.");
      return null;
    }

    const firstStep = planOutput.steps[0];
    const stepNo = firstStep.step_no ?? 1;

    updateStepStatus(stepNo, "running");
    addLog(`Calling Builder API for Step ${stepNo}...`);

    const res = await fetch("/api/orchestrator/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: planOutput.run_id,
        step: firstStep,
        plan: planOutput,
      }),
    });

    const data = await res.json();
    setBuildOutput(data);

    if (!data.success) {
      updateStepStatus(stepNo, "error");
      fail("Builder failed for first step.");
      return data;
    }

    updateStepStatus(stepNo, "success");
    addLog("✔ Build executed for Step " + stepNo);
    return data;
  };

  const callTestAPI = async () => {
    clearError();
    if (!buildOutput?.files_changed) {
      fail("Test aborted: No build output.");
      return null;
    }

    addLog("Calling Tester API...");

    const res = await fetch("/api/orchestrator/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: buildOutput.run_id,
        files_changed: buildOutput.files_changed,
        plan: planOutput,
        steps: planOutput?.steps,
      }),
    });

    const data = await res.json();
    setTestOutput(data);

    if (!data.success) {
      fail("Tests failed.");
      return data;
    }

    addLog("✔ Tests executed.");
    return data;
  };

  const callReleaseAPI = async () => {
    clearError();
    if (!testOutput?.test_results) {
      fail("Release aborted: No test results to release.");
      return null;
    }

    addLog("Calling Release API...");

    const res = await fetch("/api/orchestrator/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: testOutput.run_id,
        test_results: testOutput.test_results,
        artifacts: testOutput.artifacts,
        release_notes: "Auto-generated from Orchestrator Console",
      }),
    });

    const data = await res.json();
    setReleaseOutput(data);

    if (!data.success) {
      fail("Release failed.");
      return data;
    }

    addLog("✔ Release completed.");
    return data;
  };

  /* ============================================================
     EXECUTE BUILD QUEUE FOR ALL PLAN STEPS
     ============================================================ */

  const executeBuildQueue = async () => {
    clearError();

    if (!planOutput?.run_id || planSteps.length === 0) {
      fail("Build queue aborted: No plan or run id available.");
      return;
    }

    addLog("==============================================");
    addLog("Starting Build Queue for all plan steps...");
    const runId = planOutput.run_id;

    for (const step of planSteps) {
      const stepNo: number = step.step_no ?? 0;
      const title: string = step.title ?? "";

      updateStepStatus(stepNo, "running");
      addLog(`[BUILD QUEUE] Building Step ${stepNo}: ${title}`);

      const res = await fetch("/api/orchestrator/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          step,
          plan: planOutput,
        }),
      });

      const data = await res.json();
      setBuildOutput(data);

      if (!data.success) {
        updateStepStatus(stepNo, "error");
        fail(`Builder failed at Step ${stepNo}. Stopping build queue.`);
        addLog("Build queue stopped due to error.");
        addLog("==============================================");
        return;
      }

      updateStepStatus(stepNo, "success");
      addLog(`✔ Build completed for Step ${stepNo}.`);
    }

    addLog("✔ All build steps executed successfully.");
    addLog("==============================================");
  };

  /* ============================================================
     EXECUTE FULL PIPELINE + RECORD RUN HISTORY
     ============================================================ */

  const executeFullPipeline = async () => {
    clearError();

    if (!goalTitle || !goalDescription) {
      fail("Missing goal title or description.");
      return;
    }

    const startedAt = new Date().toISOString();
    let runRecord: RunRecord = {
      run_id: "",
      goal_title: goalTitle,
      goal_description: goalDescription,
      started_at: startedAt,
      status: "success",
    };

    addLog("==============================================");
    addLog("Starting Full Pipeline (Plan → Build(1st) → Test → Release)...");
    setIsRunning(true);

    try {
      const plan = await callPlanAPI();
      if (!plan?.success) throw new Error("Planner failed");
      runRecord.run_id = plan.run_id ?? "";
      runRecord.plan = plan;

      const build = await callBuildAPI();
      if (!build?.success) throw new Error("Builder failed");
      runRecord.build = build;

      const test = await callTestAPI();
      if (!test?.success) throw new Error("Tester failed");
      runRecord.test = test;

      const release = await callReleaseAPI();
      if (!release?.success) throw new Error("Release failed");
      runRecord.release = release;

      runRecord.completed_at = new Date().toISOString();
      runRecord.status = "success";

      addRunToHistory(runRecord);

      addLog("✔ Pipeline completed successfully.");
      addLog("==============================================");
    } catch (err: any) {
      runRecord.completed_at = new Date().toISOString();
      runRecord.status = "failed";
      runRecord.error = err?.message ?? "Unknown error";
      addRunToHistory(runRecord);

      fail(`Pipeline failed: ${err?.message}`);
      addLog("==============================================");
    } finally {
      setIsRunning(false);
    }
  };

  /* ============================================================
     HISTORY TAB HELPERS
     ============================================================ */

  let selectedRun: RunRecord | null = null;
  if (
    selectedRunIndex !== null &&
    selectedRunIndex >= 0 &&
    selectedRunIndex < runHistory.length
  ) {
    selectedRun = runHistory[selectedRunIndex] ?? null;
  }

  /* ============================================================
     RENDER UI
     ============================================================ */

  return (
    <div className="p-6 space-y-6">
      {/* Error Banner */}
      <ErrorBanner message={error} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">RocketGPT Orchestrator Console</h1>
        <Button onClick={executeFullPipeline} disabled={isRunning}>
          {isRunning ? "Running..." : "Execute Full Pipeline"}
        </Button>
      </div>

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="build">Build</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
          <TabsTrigger value="release">Release</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* PLAN TAB */}
        <TabsContent value="plan">
          <Input
            placeholder="Goal Title"
            value={goalTitle}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGoalTitle(e.target.value)}
          />
          <Textarea
            placeholder="Goal Description"
            value={goalDescription}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoalDescription(e.target.value)}
          />

          <Button onClick={callPlanAPI} className="mt-3">
            Generate Plan
          </Button>

          <pre className="bg-black text-white p-4 rounded mt-4 text-sm overflow-auto">
            {planOutput ? JSON.stringify(planOutput, null, 2) : "No plan yet."}
          </pre>
        </TabsContent>

        {/* BUILD TAB */}
        <TabsContent value="build">
          <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Button onClick={callBuildAPI}>Execute First Build Step</Button>
              <Button variant="outline" onClick={executeBuildQueue}>
                Execute All Plan Steps (Build Queue)
              </Button>
            </div>

            <div className="space-y-2 mt-4">
              <p className="font-semibold text-sm">Plan Steps</p>
              {planSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No plan steps loaded. Generate a plan first.
                </p>
              ) : (
                planSteps.map((step: any, idx: number) => {
                  const stepNo: number = step.step_no ?? idx + 1;
                  const status = stepStatuses[stepNo] ?? "pending";
                  return (
                    <div
                      key={stepNo}
                      className="flex items-center justify-between border rounded px-3 py-2 bg-muted text-sm"
                    >
                      <div>
                        <p className="font-semibold">
                          Step {stepNo}: {step.title}
                        </p>
                        {step.description && (
                          <p className="text-xs text-muted-foreground">
                            {step.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs">Status: {status}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4">
              <BuildResultView output={buildOutput} />
            </div>
          </div>
        </TabsContent>

        {/* TEST TAB */}
        <TabsContent value="test">
          <Button onClick={callTestAPI}>Execute Tests</Button>
          <div className="mt-4">
            <TestResultView output={testOutput} />
          </div>
        </TabsContent>

        {/* RELEASE TAB */}
        <TabsContent value="release">
          <Button onClick={callReleaseAPI}>Perform Release</Button>
          <div className="mt-4">
            <ReleaseResultView output={releaseOutput} />
          </div>
        </TabsContent>

        {/* ARTIFACTS TAB */}
        <TabsContent value="artifacts">
          <ArtifactsView
            artifacts={testOutput?.artifacts || releaseOutput?.artifacts || []}
          />
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="font-semibold text-lg">Run History</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAllRunsJson}
                disabled={runHistory.length === 0}
              >
                Download All Runs (JSON)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
              >
                Clear History
              </Button>
            </div>
          </div>

          {runHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No previous runs recorded yet. Execute a full pipeline to record history.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[260px,1fr]">
              <div className="border rounded p-2 bg-muted max-h-[420px] overflow-auto space-y-1">
                {runHistory.map((run, idx) => {
                  const isSelected = idx === selectedRunIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedRunIndex(idx)}
                      className={`w-full text-left px-2 py-2 rounded text-xs mb-1 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-background"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold truncate max-w-[150px]">
                          {run.goal_title || `Run ${idx + 1}`}
                        </span>
                        <span
                          className={`ml-2 ${
                            run.status === "success" ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {run.started_at
                          ? new Date(run.started_at).toLocaleString()
                          : "N/A"}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border rounded p-3 bg-muted text-xs max-h-[420px] overflow-auto">
                {!selectedRun ? (
                  <p>Select a run to view details.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">
                          {selectedRun.goal_title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedRun.goal_description}
                        </p>
                        <p className="text-[11px] mt-1">
                          Status:{" "}
                          <span
                            className={
                              selectedRun.status === "success"
                                ? "text-emerald-500"
                                : "text-red-500"
                            }
                          >
                            {selectedRun.status}
                          </span>
                        </p>
                        <p className="text-[11px]">
                          Started:{" "}
                          {selectedRun.started_at
                            ? new Date(selectedRun.started_at).toLocaleString()
                            : "N/A"}
                        </p>
                        {selectedRun.completed_at && (
                          <p className="text-[11px]">
                            Completed:{" "}
                            {new Date(selectedRun.completed_at).toLocaleString()}
                          </p>
                        )}
                        {selectedRun.error && (
                          <pre className="bg-red-900 text-white p-2 rounded mt-2">
                            {selectedRun.error}
                          </pre>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 ml-3">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => downloadRunJson(selectedRun)}
                        >
                          Download Run JSON
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => downloadRunArtifactsJson(selectedRun)}
                        >
                          Download Artifacts JSON
                        </Button>
                      </div>
                    </div>

                    <details open>
                      <summary className="cursor-pointer font-semibold">
                        Plan Output
                      </summary>
                      <pre className="bg-black text-white p-2 rounded mt-1 overflow-auto">
                        {selectedRun.plan
                          ? JSON.stringify(selectedRun.plan, null, 2)
                          : "No plan recorded."}
                      </pre>
                    </details>

                    <details>
                      <summary className="cursor-pointer font-semibold">
                        Build Output
                      </summary>
                      <pre className="bg-black text-white p-2 rounded mt-1 overflow-auto">
                        {selectedRun.build
                          ? JSON.stringify(selectedRun.build, null, 2)
                          : "No build recorded."}
                      </pre>
                    </details>

                    <details>
                      <summary className="cursor-pointer font-semibold">
                        Test Output
                      </summary>
                      <pre className="bg-black text-white p-2 rounded mt-1 overflow-auto">
                        {selectedRun.test
                          ? JSON.stringify(selectedRun.test, null, 2)
                          : "No test recorded."}
                      </pre>
                    </details>

                    <details>
                      <summary className="cursor-pointer font-semibold">
                        Release Output
                      </summary>
                      <pre className="bg-black text-white p-2 rounded mt-1 overflow-auto">
                        {selectedRun.release
                          ? JSON.stringify(selectedRun.release, null, 2)
                          : "No release recorded."}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Execution Logs</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              disabled={logs.length === 0}
            >
              Download Logs
            </Button>
          </div>
          <pre className="bg-black text-green-400 p-4 rounded text-sm h-[400px] overflow-auto">
            {logs.length === 0 ? "No logs yet." : logs.join("\n")}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}



