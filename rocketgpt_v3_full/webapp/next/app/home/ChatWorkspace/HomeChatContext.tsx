"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

import { suggestCats } from "@/lib/cats-suggest";
import { SEED_CATS } from "@/lib/cats-seed";
import { buildWorkflowArtifactFromSuggestions, saveWorkflowDraftToStorage } from "@/lib/workflow-draft";
import { WorkflowNode, WorkflowArtifact } from "@/lib/workflow-types";
import { validateWorkflow, WorkflowValidationResult } from "@/lib/workflow-validate";

export type HomeChatRole = "user" | "assistant";

export interface HomeChatMessage {
  id: string;
  role: HomeChatRole;
  name: string;
  content: string;
  time: string;
}

export interface UseHomeChatResult {
  messages: HomeChatMessage[];
  sending: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
  resetChat: () => void;
  resetKey: number;
  designModeEnabled: boolean;
  setDesignModeEnabled: (next: boolean) => void;
  draftArtifact: WorkflowArtifact | null;
  validation: WorkflowValidationResult | null;
  initParamDrafts: Record<string, string>;
  initParamErrors: Record<string, string>;
  setNodeExpectedBehavior: (nodeId: string, expectedBehavior: string) => void;
  setInitParamDraft: (nodeId: string, raw: string) => void;
  applyInitParams: (nodeId: string) => void;
  toggleNodeOutput: (nodeId: string, outputId: string) => void;
  updateNodeOutputLabel: (nodeId: string, outputId: string, label: string) => void;
  addNodeOutput: (nodeId: string) => void;
  removeNodeOutput: (nodeId: string, outputId: string) => void;
}

type HomeChatContextValue = UseHomeChatResult;

const HomeChatContext = createContext<HomeChatContextValue | null>(null);

const WORKFLOW_INTENT_PATTERNS: RegExp[] = [
  /\bworkflow\b/i,
  /\bplan\b/i,
  /\bplanner\b/i,
  /\bdraft\b/i,
  /\bbuilder\b/i,
  /\borchestrator\b/i,
  /\bcat(s)?\b/i,
  /\bpipeline\b/i,
];

function hasExplicitWorkflowIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return WORKFLOW_INTENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

async function requestRuntimeChatReply(input: {
  userText: string;
  nextMessages: HomeChatMessage[];
}): Promise<string> {
  const payloadMessages = input.nextMessages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const response = await fetch("/api/demo/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: payloadMessages,
      message: input.userText,
      chatId: "home-chat",
    }),
  });

  const data = await response.json().catch(() => null);
  const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
  if (!response.ok) {
    const reason = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
    throw new Error(reason);
  }
  if (reply.length === 0) {
    throw new Error("Runtime chat endpoint returned an empty reply.");
  }
  return reply;
}

function formatAssistantWorkflowMessage(artifact: WorkflowArtifact, validation: WorkflowValidationResult): string {
  const catsHeader = `Suggested workflow draft (${artifact.nodes.length} CATs)`;
  const catLines = artifact.nodes.map((node, index) => {
    return `${index + 1}. ${node.cat_id} | ${node.name} | ${node.canonical_name}\n   Why selected: ${node.selection_reason}`;
  });
  const governance = validation.governanceSummary;
  const governanceLine = [
    "Governance summary:",
    `approval=${governance.anyRequiresApproval ? "required" : "not_required"}`,
    `passport=${governance.anyRequiresPassport ? "required" : "not_required"}`,
    `side_effects=${governance.sideEffects.join(",") || "none"}`,
    `elevated=${governance.anyElevated ? "true" : "false"}`,
  ].join(" ");

  return [catsHeader, "", ...catLines, "", governanceLine, "", "Open Workflow Builder", "Download Draft JSON"].join(
    "\n"
  );
}

function nowTimeLabel(): string {
  return new Date().toTimeString().slice(0, 5);
}

function applyNodeUpdate(
  artifact: WorkflowArtifact | null,
  updater: (nodes: WorkflowNode[]) => WorkflowNode[]
): WorkflowArtifact | null {
  if (!artifact) return null;
  return { ...artifact, nodes: updater(artifact.nodes) };
}

export function HomeChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<HomeChatMessage[]>([]);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState<number>(0);
  const [designModeEnabled, setDesignModeEnabled] = useState<boolean>(false);
  const [draftArtifact, setDraftArtifact] = useState<WorkflowArtifact | null>(null);
  const [validation, setValidation] = useState<WorkflowValidationResult | null>(null);
  const [initParamDrafts, setInitParamDrafts] = useState<Record<string, string>>({});
  const [initParamErrors, setInitParamErrors] = useState<Record<string, string>>({});

  function persistArtifact(nextArtifact: WorkflowArtifact) {
    const nextValidation = validateWorkflow(nextArtifact, SEED_CATS);
    saveWorkflowDraftToStorage(nextArtifact);
    setDraftArtifact(nextArtifact);
    setValidation(nextValidation);
    return nextValidation;
  }

  function commitNodeEdits(updater: (nodes: WorkflowNode[]) => WorkflowNode[]) {
    setDraftArtifact((current) => {
      const next = applyNodeUpdate(current, updater);
      if (!next) return current;
      const nextValidation = validateWorkflow(next, SEED_CATS);
      saveWorkflowDraftToStorage(next);
      setValidation(nextValidation);
      return next;
    });
  }

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const time = nowTimeLabel();
    const userMessage: HomeChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      name: "You",
      content: trimmed,
      time,
    };

    setSending(true);
    setError(null);

    try {
      const nextMessages = [...messages, userMessage];
      const shouldGenerateDraft = designModeEnabled || hasExplicitWorkflowIntent(trimmed);
      if (shouldGenerateDraft) {
        const conversationText = nextMessages
          .filter((item) => item.role === "user")
          .map((item) => item.content)
          .join("\n");
        const suggestions = suggestCats(conversationText, SEED_CATS);
        const nextArtifact = buildWorkflowArtifactFromSuggestions(
          suggestions,
          conversationText,
          undefined,
          "chat"
        );
        const nextValidation = persistArtifact(nextArtifact);
        setInitParamDrafts(
          nextArtifact.nodes.reduce<Record<string, string>>((acc, node) => {
            acc[node.node_id] = JSON.stringify(node.init_params || {}, null, 2);
            return acc;
          }, {})
        );
        setInitParamErrors({});
        setDesignModeEnabled(true);

        const assistantMessage: HomeChatMessage = {
          id: `assistant-${Date.now() + 1}`,
          role: "assistant",
          name: "RocketGPT",
          content: formatAssistantWorkflowMessage(nextArtifact, nextValidation),
          time,
        };
        setMessages([...nextMessages, assistantMessage]);
      } else {
        const runtimeReply = await requestRuntimeChatReply({
          userText: trimmed,
          nextMessages,
        });
        const assistantMessage: HomeChatMessage = {
          id: `assistant-${Date.now() + 1}`,
          role: "assistant",
          name: "RocketGPT",
          content: runtimeReply,
          time,
        };
        setMessages([...nextMessages, assistantMessage]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Deterministic draft generation failed";
      setError(msg);
      const errMessage: HomeChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        name: "RocketGPT",
        content: `Error: ${msg}`,
        time,
      };
      setMessages((prev) => [...prev, userMessage, errMessage]);
    } finally {
      setSending(false);
    }
  };

  const clearMessages = (): void => {
    setMessages([]);
    setError(null);
  };

  const resetChat = (): void => {
    setMessages([]);
    setError(null);
    setSending(false);
    setResetKey((k) => k + 1);
    setDraftArtifact(null);
    setValidation(null);
    setInitParamDrafts({});
    setInitParamErrors({});
  };

  function setNodeExpectedBehavior(nodeId: string, expectedBehavior: string) {
    commitNodeEdits((nodes) =>
      nodes.map((node) => (node.node_id === nodeId ? { ...node, expected_behavior: expectedBehavior } : node))
    );
  }

  function setInitParamDraft(nodeId: string, raw: string) {
    setInitParamDrafts((current) => ({ ...current, [nodeId]: raw }));
  }

  function applyInitParams(nodeId: string) {
    const raw = initParamDrafts[nodeId] ?? "{}";
    try {
      const parsed = JSON.parse(raw || "{}");
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setInitParamErrors((current) => ({ ...current, [nodeId]: "Init params must be a JSON object." }));
        return;
      }
      setInitParamErrors((current) => {
        const next = { ...current };
        delete next[nodeId];
        return next;
      });
      commitNodeEdits((nodes) => nodes.map((node) => (node.node_id === nodeId ? { ...node, init_params: parsed } : node)));
    } catch {
      setInitParamErrors((current) => ({ ...current, [nodeId]: "Invalid JSON." }));
    }
  }

  function toggleNodeOutput(nodeId: string, outputId: string) {
    commitNodeEdits((nodes) =>
      nodes.map((node) =>
        node.node_id !== nodeId
          ? node
          : {
              ...node,
              expected_outputs: node.expected_outputs.map((output) =>
                output.id === outputId ? { ...output, checked: !output.checked } : output
              ),
            }
      )
    );
  }

  function updateNodeOutputLabel(nodeId: string, outputId: string, label: string) {
    commitNodeEdits((nodes) =>
      nodes.map((node) =>
        node.node_id !== nodeId
          ? node
          : {
              ...node,
              expected_outputs: node.expected_outputs.map((output) =>
                output.id === outputId ? { ...output, label } : output
              ),
            }
      )
    );
  }

  function addNodeOutput(nodeId: string) {
    commitNodeEdits((nodes) =>
      nodes.map((node) => {
        if (node.node_id !== nodeId) return node;
        const nextNumber = node.expected_outputs.length + 1;
        return {
          ...node,
          expected_outputs: [
            ...node.expected_outputs,
            {
              id: `${node.node_id}-out-${nextNumber}`,
              label: "New expected output",
              checked: false,
            },
          ],
        };
      })
    );
  }

  function removeNodeOutput(nodeId: string, outputId: string) {
    commitNodeEdits((nodes) =>
      nodes.map((node) =>
        node.node_id !== nodeId
          ? node
          : { ...node, expected_outputs: node.expected_outputs.filter((output) => output.id !== outputId) }
      )
    );
  }

  const value: HomeChatContextValue = {
    messages,
    sending,
    error,
    sendMessage,
    clearMessages,
    resetChat,
    resetKey,
    designModeEnabled,
    setDesignModeEnabled,
    draftArtifact,
    validation,
    initParamDrafts,
    initParamErrors,
    setNodeExpectedBehavior,
    setInitParamDraft,
    applyInitParams,
    toggleNodeOutput,
    updateNodeOutputLabel,
    addNodeOutput,
    removeNodeOutput,
  };

  return <HomeChatContext.Provider value={value}>{children}</HomeChatContext.Provider>;
}

export function useHomeChat(): HomeChatContextValue {
  const ctx = useContext(HomeChatContext);
  if (!ctx) {
    throw new Error("useHomeChat must be used within HomeChatProvider");
  }
  return ctx;
}
