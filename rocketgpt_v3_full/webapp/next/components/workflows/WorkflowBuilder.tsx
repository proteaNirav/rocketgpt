"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Download, Mail, Play, Square } from "lucide-react";

import Palette from "@/components/workflows/Palette";
import WorkflowCanvas from "@/components/workflows/WorkflowCanvas";
import { getCatsForUi } from "@/lib/cats-for-ui";
import { recordCatsUsage } from "@/lib/cats-usage";
import { isDemoMode } from "@/lib/demo-mode";
import {
  buildWorkflowRunReportEmail,
  DemoEmail,
  loadEmailOutbox,
  pushEmailOutbox,
} from "@/lib/email-outbox";
import { publishNotification, NotifyEvent, subscribeNotifications } from "@/lib/notify";
import { executeWorkflowRun, WorkflowRunSignal } from "@/lib/workflow-runner";
import {
  WorkflowNode,
  WorkflowRunHistoryRecord,
  WorkflowStepResult,
} from "@/lib/workflow-types";
import { loadWorkflowDraftFromStorage } from "@/lib/workflow-draft";

const WORKFLOW_DRAFT_KEY = "rgpt.workflow.draft.v1";
const WORKFLOW_RUNS_KEY = "rgpt.workflow.runs.v1";
const MAX_RUNS = 20;

type DraftShape = {
  version: 1;
  workflowId: string;
  conversationText: string;
  nodes: WorkflowNode[];
  updatedAt: string;
};

function createWorkflowId(): string {
  return `wf-${Date.now()}`;
}

function makeNodeId(catId: string): string {
  return `step-${catId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
}

function isWorkflowNodeArray(value: unknown): value is WorkflowNode[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    const candidate = item as Partial<WorkflowNode>;
    return typeof candidate.node_id === "string" && typeof candidate.cat_id === "string" && typeof candidate.name === "string";
  });
}

function createNodeFromCat(item: ReturnType<typeof getCatsForUi>[number]): WorkflowNode {
  return {
    node_id: makeNodeId(item.cat_id),
    cat_id: item.cat_id,
    canonical_name: item.canonical_name,
    name: item.name,
    purpose: item.purpose,
    allowed_side_effects: item.allowed_side_effects,
    requires_approval: item.requires_approval,
    passport_required: item.passport_required,
    selection_reason: "added in workflow builder",
    score: 0,
    init_params: {},
    expected_behavior: `Run ${item.name} in sequence.`,
    expected_outputs: [
      { id: `${item.cat_id}-out-1`, label: "Primary output generated", checked: false },
      { id: `${item.cat_id}-out-2`, label: "No policy violations", checked: false },
    ],
  };
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatDuration(ms: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function loadRunHistory(): WorkflowRunHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKFLOW_RUNS_KEY) || "[]") as WorkflowRunHistoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRunHistory(records: WorkflowRunHistoryRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKFLOW_RUNS_KEY, JSON.stringify(records.slice(0, MAX_RUNS)));
}

function upsertResults(existing: WorkflowStepResult[], incoming: WorkflowStepResult): WorkflowStepResult[] {
  const index = existing.findIndex((item) => item.stepId === incoming.stepId);
  if (index < 0) {
    return [...existing, incoming];
  }
  const next = [...existing];
  next[index] = incoming;
  return next;
}

async function exportResultsXlsx(results: WorkflowStepResult[]): Promise<void> {
  const rows = results.map((item) => ({
    stepId: item.stepId,
    catId: item.catId,
    status: item.status,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    durationMs: item.durationMs,
    outputSummary: item.outputSummary,
  }));

  const xlsx = await import("xlsx");
  const worksheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Workflow Results");
  xlsx.writeFile(workbook, "workflow-results.xlsx");
}

export default function WorkflowBuilder() {
  const searchParams = useSearchParams();
  const [catsVersion, setCatsVersion] = useState(0);
  const cats = useMemo(() => {
    void catsVersion;
    return getCatsForUi();
  }, [catsVersion]);
  const demoMode = isDemoMode();

  const [workflowId, setWorkflowId] = useState(createWorkflowId());
  const [conversationText, setConversationText] = useState("");
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);

  const [results, setResults] = useState<WorkflowStepResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [viewJsonResultId, setViewJsonResultId] = useState<string | null>(null);

  const [runHistory, setRunHistory] = useState<WorkflowRunHistoryRecord[]>([]);

  const [notifications, setNotifications] = useState<NotifyEvent[]>([]);
  const [toasts, setToasts] = useState<NotifyEvent[]>([]);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  const [emails, setEmails] = useState<DemoEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stepStatusNotifiedRef = useRef<Set<string>>(new Set());
  const runSignalRef = useRef<WorkflowRunSignal>({ stopped: false });

  const hasDispatch = useMemo(
    () => nodes.some((node) => node.allowed_side_effects.includes("workflow_dispatch")),
    [nodes]
  );

  const selectedEmail = useMemo(
    () => emails.find((item) => item.id === selectedEmailId) || null,
    [emails, selectedEmailId]
  );

  useEffect(() => {
    const unsubscribe = subscribeNotifications((event) => {
      setNotifications((current) => [event, ...current].slice(0, 100));
      setToasts((current) => [event, ...current].slice(0, 3));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== event.id));
      }, 3500);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "rgpt.cats.dynamic.v1") {
        setCatsVersion((value) => value + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    setRunHistory(loadRunHistory());
    const loadedOutbox = loadEmailOutbox();
    setEmails(loadedOutbox);
    if (loadedOutbox.length > 0) {
      setSelectedEmailId(loadedOutbox[0].id);
    }
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("from");
    const draftFromStorage = (() => {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(WORKFLOW_DRAFT_KEY) || "") as DraftShape;
        return parsed;
      } catch {
        return null;
      }
    })();

    if (draftFromStorage?.version === 1 && isWorkflowNodeArray(draftFromStorage.nodes)) {
      setWorkflowId(draftFromStorage.workflowId || createWorkflowId());
      setConversationText(draftFromStorage.conversationText || "");
      setNodes(draftFromStorage.nodes);
      return;
    }

    const legacyDraft = loadWorkflowDraftFromStorage(fromUrl === "story" ? null : undefined);
    if (legacyDraft?.nodes?.length) {
      setWorkflowId(`wf-${legacyDraft.draft_id}`);
      setConversationText(legacyDraft.conversation_text || "");
      setNodes(legacyDraft.nodes);
      publishNotification({
        level: "info",
        title: "Draft Loaded",
        message: "Loaded legacy story/builder draft.",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: DraftShape = {
      version: 1,
      workflowId,
      conversationText,
      nodes,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(WORKFLOW_DRAFT_KEY, JSON.stringify(payload));
  }, [conversationText, nodes, workflowId]);

  function addCatByItem(item: ReturnType<typeof getCatsForUi>[number]): void {
    const nextNode = createNodeFromCat(item);
    setNodes((current) => [...current, nextNode]);
    recordCatsUsage({
      catId: item.cat_id,
      canonicalName: item.canonical_name,
      action: "add_to_workflow",
    });
    publishNotification({
      level: "success",
      title: "Step Added",
      message: `${item.name} added to workflow.`,
    });
  }

  function addCatById(catId: string): void {
    const item = cats.find((row) => row.cat_id === catId);
    if (!item) return;
    addCatByItem(item);
  }

  function removeStep(nodeId: string): void {
    setNodes((current) => current.filter((node) => node.node_id !== nodeId));
  }

  function moveStep(nodeId: string, direction: -1 | 1): void {
    setNodes((current) => {
      const index = current.findIndex((node) => node.node_id === nodeId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function reorderSteps(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    setNodes((current) => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= current.length || toIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function saveDraftNow(): void {
    const payload: DraftShape = {
      version: 1,
      workflowId,
      conversationText,
      nodes,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(WORKFLOW_DRAFT_KEY, JSON.stringify(payload));
    publishNotification({
      level: "success",
      title: "Workflow Saved",
      message: "Draft persisted to local storage.",
    });
  }

  function exportWorkflowJson(): void {
    const payload: DraftShape = {
      version: 1,
      workflowId,
      conversationText,
      nodes,
      updatedAt: new Date().toISOString(),
    };
    downloadJson("workflow-draft.json", payload);
    publishNotification({
      level: "success",
      title: "Export Complete",
      message: "Workflow JSON exported.",
    });
  }

  async function importWorkflowJson(file: File): Promise<void> {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<DraftShape> & { nodes?: unknown };
      if (!isWorkflowNodeArray(parsed.nodes)) {
        throw new Error("Invalid workflow JSON: missing nodes array.");
      }

      setWorkflowId(parsed.workflowId || createWorkflowId());
      setConversationText(parsed.conversationText || "");
      setNodes(parsed.nodes);

      publishNotification({
        level: "success",
        title: "Import Complete",
        message: `Imported ${parsed.nodes.length} workflow steps.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown import error.";
      setImportError(message);
      publishNotification({
        level: "error",
        title: "Import Failed",
        message,
      });
    }
  }

  function stopRun(): void {
    runSignalRef.current.stopped = true;
    setIsRunning(false);
    publishNotification({
      level: "warning",
      title: "Run Stopped",
      message: "Stop signal sent. Current step will halt safely.",
    });
  }

  async function runWorkflow(): Promise<void> {
    if (nodes.length === 0 || isRunning) return;

    const runId = `run-${Date.now()}`;
    const startedAt = new Date().toISOString();

    stepStatusNotifiedRef.current = new Set();
    runSignalRef.current = { stopped: false };

    const queued: WorkflowStepResult[] = nodes.map((node) => ({
      stepId: node.node_id,
      catId: node.cat_id,
      status: "queued",
      startedAt,
      endedAt: startedAt,
      durationMs: 0,
      outputSummary: "Queued",
      outputJson: { queued: true },
      artifacts: [],
    }));

    setResults(queued);
    setIsRunning(true);
    setActiveRunId(runId);

    publishNotification({
      level: "info",
      title: "Run Started",
      message: `Workflow run ${runId} started.`,
    });

    const runResponse = await executeWorkflowRun({
      workflowId,
      nodes,
      signal: runSignalRef.current,
      callbacks: {
        onStepUpdate: (stepResult) => {
          setResults((current) => upsertResults(current, stepResult));

          if ((stepResult.status === "success" || stepResult.status === "failed") && !stepStatusNotifiedRef.current.has(stepResult.stepId)) {
            stepStatusNotifiedRef.current.add(stepResult.stepId);
            publishNotification({
              level: stepResult.status === "success" ? "success" : "error",
              title: `Step ${stepResult.status === "success" ? "Success" : "Failed"}`,
              message: `${stepResult.catId} ${stepResult.status}.`,
            });
          }
        },
      },
    });

    const endedAt = new Date().toISOString();

    const record: WorkflowRunHistoryRecord = {
      runId,
      createdAt: endedAt,
      workflow: {
        draftId: workflowId,
        nodes,
      },
      run: {
        workflowId,
        startedAt,
        endedAt,
        stopped: runResponse.stopped,
        results: runResponse.results,
      },
    };

    const updatedHistory = [record, ...loadRunHistory()].slice(0, MAX_RUNS);
    saveRunHistory(updatedHistory);
    setRunHistory(updatedHistory);
    runResponse.results.forEach((item) => {
      recordCatsUsage({
        catId: item.catId,
        action: "run_completed",
      });
    });

    const emailDraft = buildWorkflowRunReportEmail(
      runId,
      workflowId,
      runResponse.results.map((item) => ({
        step: item.catId,
        status: item.status,
        durationMs: item.durationMs,
      }))
    );
    const storedEmail = pushEmailOutbox(emailDraft);
    const nextEmails = [storedEmail, ...loadEmailOutbox().filter((item) => item.id !== storedEmail.id)];
    setEmails(nextEmails);
    setSelectedEmailId(storedEmail.id);

    setIsRunning(false);
    publishNotification({
      level: runResponse.stopped ? "warning" : "success",
      title: "Run Finished",
      message: runResponse.stopped ? "Workflow run stopped early." : "Workflow run completed.",
    });
  }

  const resultsOrdered = useMemo(() => {
    const indexMap = new Map(nodes.map((node, index) => [node.node_id, index]));
    return [...results].sort((a, b) => (indexMap.get(a.stepId) ?? 0) - (indexMap.get(b.stepId) ?? 0));
  }, [nodes, results]);

  return (
    <div className="space-y-4">
      {demoMode ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          Demo mode (Supabase not configured) - all workflow data is local to this browser.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
        <div className="space-y-1">
          <p className="text-sm font-medium">Workflow ID: <span className="font-mono">{workflowId}</span></p>
          <p className="text-xs text-gray-600 dark:text-gray-300">Draft key: <code>{WORKFLOW_DRAFT_KEY}</code></p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveDraftNow}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={exportWorkflowJson}
            className="inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" /> Export Workflow JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Import Workflow JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void importWorkflowJson(file);
              }
              event.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => setIsNotificationDrawerOpen((current) => !current)}
            className="relative rounded border border-gray-300 p-2 hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                {Math.min(99, notifications.length)}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs text-gray-600 dark:text-gray-300">Conversation Context</span>
        <textarea
          value={conversationText}
          onChange={(event) => setConversationText(event.target.value)}
          rows={2}
          className="w-full rounded border border-gray-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Optional context for the workflow draft"
        />
      </label>

      {importError ? (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
          {importError}
        </div>
      ) : null}

      {hasDispatch ? (
        <div className="inline-flex rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
          Contains workflow dispatch side-effects
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Palette cats={cats} onAddCat={addCatByItem} />
        <WorkflowCanvas
          nodes={nodes}
          onDropPaletteCat={addCatById}
          onMove={moveStep}
          onDelete={removeStep}
          onReorder={reorderSteps}
        />
      </div>

      <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runWorkflow()}
            disabled={isRunning || nodes.length === 0}
            className="inline-flex items-center gap-2 rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            <Play className="h-4 w-4" /> Run Workflow
          </button>
          <button
            type="button"
            onClick={stopRun}
            disabled={!isRunning}
            className="inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            <Square className="h-4 w-4" /> Stop
          </button>

          <button
            type="button"
            onClick={() => {
              downloadJson("workflow-results.json", { workflowId, runId: activeRunId, results: resultsOrdered });
              publishNotification({
                level: "success",
                title: "Export Complete",
                message: "Results JSON exported.",
              });
            }}
            disabled={resultsOrdered.length === 0}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Export Results JSON
          </button>
          <button
            type="button"
            onClick={() => {
              void exportResultsXlsx(resultsOrdered)
                .then(() => {
                  publishNotification({
                    level: "success",
                    title: "Export Complete",
                    message: "Results exported as XLSX.",
                  });
                })
                .catch(() => {
                  publishNotification({
                    level: "error",
                    title: "Export Failed",
                    message: "Unable to export XLSX.",
                  });
                });
            }}
            disabled={resultsOrdered.length === 0}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-neutral-700"
          >
            Export XLSX
          </button>
        </div>

        <div className="mt-3 overflow-x-auto rounded border border-gray-200 dark:border-neutral-800">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-700 dark:bg-neutral-900 dark:text-gray-300">
              <tr>
                <th className="p-2">Step</th>
                <th className="p-2">CAT</th>
                <th className="p-2">Status</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Output</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resultsOrdered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-3 text-gray-600 dark:text-gray-300">
                    No run results yet.
                  </td>
                </tr>
              ) : (
                resultsOrdered.map((item) => (
                  <tr key={item.stepId} className="border-t border-gray-200 dark:border-neutral-800">
                    <td className="p-2 font-mono text-xs">{item.stepId}</td>
                    <td className="p-2 font-mono text-xs">{item.catId}</td>
                    <td className="p-2">{item.status}</td>
                    <td className="p-2">{formatDuration(item.durationMs)}</td>
                    <td className="p-2">{item.outputSummary}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => setViewJsonResultId(item.stepId)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-neutral-700"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <h3 className="text-sm font-semibold">Run History ({WORKFLOW_RUNS_KEY})</h3>
        <div className="mt-2 space-y-2">
          {runHistory.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">No run history.</p>
          ) : (
            runHistory.map((entry) => (
              <div key={entry.runId} className="rounded border border-gray-200 p-2 text-xs dark:border-neutral-700">
                <p className="font-mono">{entry.runId}</p>
                <p className="text-gray-600 dark:text-gray-300">{entry.createdAt}</p>
                <p>
                  {entry.run.results.filter((item) => item.status === "success").length} success / {entry.run.results.filter((item) => item.status === "failed").length} failed
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 p-4 dark:border-neutral-800">
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Demo Email Outbox</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            {emails.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">Outbox is empty.</p>
            ) : (
              emails.map((email) => (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => setSelectedEmailId(email.id)}
                  className={`w-full rounded border p-2 text-left text-xs ${
                    selectedEmailId === email.id
                      ? "border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-900/20"
                      : "border-gray-200 dark:border-neutral-700"
                  }`}
                >
                  <p className="font-semibold">{email.subject}</p>
                  <p className="text-gray-600 dark:text-gray-300">{email.createdAt}</p>
                </button>
              ))
            )}
          </div>
          <div className="rounded border border-gray-200 p-2 dark:border-neutral-700">
            {selectedEmail ? (
              <>
                <p className="text-xs font-semibold">{selectedEmail.subject}</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">To: {selectedEmail.to}</p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs dark:bg-neutral-900">
                  {selectedEmail.body}
                </pre>
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">Select an email to view content.</p>
            )}
          </div>
        </div>
      </section>

      {viewJsonResultId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-3xl rounded-xl border border-gray-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-950">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Result JSON</h3>
              <button
                type="button"
                onClick={() => setViewJsonResultId(null)}
                className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
            <pre className="max-h-[65vh] overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-[12px] dark:border-neutral-800 dark:bg-neutral-900/40">
              {JSON.stringify(resultsOrdered.find((item) => item.stepId === viewJsonResultId)?.outputJson ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      {isNotificationDrawerOpen ? (
        <aside className="fixed right-4 top-16 z-40 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-950">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(false)}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs dark:border-neutral-700"
            >
              Close
            </button>
          </div>
          <div className="max-h-72 space-y-2 overflow-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-300">No notifications yet.</p>
            ) : (
              notifications.map((event) => (
                <div key={event.id} className="rounded border border-gray-200 p-2 text-xs dark:border-neutral-700">
                  <p className="font-semibold">{event.title}</p>
                  <p>{event.message}</p>
                  <p className="mt-1 text-gray-600 dark:text-gray-300">{event.createdAt}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      ) : null}

      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((event) => (
          <div
            key={event.id}
            className={`w-72 rounded-lg border px-3 py-2 text-xs shadow ${
              event.level === "success"
                ? "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/30 dark:text-green-100"
                : event.level === "error"
                  ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100"
                  : event.level === "warning"
                    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
                    : "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-100"
            }`}
          >
            <p className="font-semibold">{event.title}</p>
            <p>{event.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
