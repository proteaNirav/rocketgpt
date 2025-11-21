"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMode } from "../layout/ModeContext"; // Read selected mode/profile
import { useEngineOutput, OrchestratorKind } from "./EngineOutputContext";

type ChatWorkspaceProps = {
  sessionsOpen: boolean;
  toolsOpen: boolean;
  onToggleSessions: () => void;
  onToggleTools: () => void;
  onFocus: () => void;
};

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  kind?: OrchestratorKind;
  modeProfileId?: string;
  modelHint?: string;
};

export function ChatWorkspace({
  sessionsOpen,
  toolsOpen,
  onToggleSessions,
  onToggleTools,
  onFocus,
}: ChatWorkspaceProps) {
  const { selectedModelId } = useMode();
  const { setLastOutput } = useEngineOutput();

  const [input, setInput] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text:
        "Hello! I’m RocketGPT. I’m wired to the new Mode selector and orchestrator demo. " +
        "Ask me about SQL, UI/UX, finance, big data, maths, or workflows and I’ll show how routing behaves.",
      kind: "direct",
      modeProfileId: "llm-gpt-5.1",
      modelHint: "llm-gpt-5.1",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  };

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Auto-grow composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const maxHeight = 160;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed && attachments.length === 0) return;

    const attachmentNote =
      attachments.length > 0
        ? ` (attachments: ${attachments.map((f) => f.name).join(", ")})`
        : "";

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed || attachmentNote || "",
    };

    appendMessage(userMsg);
    setInput("");
    setAttachments([]);

    if (!trimmed) return;

    const payload = {
      message: trimmed,
      modeProfileId: selectedModelId,
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        // eslint-disable-next-line no-console
        console.error("Chat API error:", res.status, text);

        const id = `assistant-error-${Date.now()}`;
        const errorText =
          "There was an error talking to the orchestrator. Please try again.";

        appendMessage({ id, role: "assistant", text: errorText });

        setLastOutput({
          id,
          kind: undefined,
          modeProfileId: selectedModelId,
          modelHint: undefined,
          replyText: errorText,
          createdAt: new Date().toISOString(),
        });
        return;
      }

      const data: any = await res.json();
      // eslint-disable-next-line no-console
      console.log("RocketGPT chat response:", data);

      const assistantText =
        typeof data?.reply === "string"
          ? data.reply
          : "Orchestrator responded, but reply text was missing.";

      const kind: OrchestratorKind | undefined =
        data?.kind === "auto" || data?.kind === "workflow" || data?.kind === "direct"
          ? data.kind
          : undefined;

      let modelHint: string | undefined;
      if (kind === "auto" && typeof data?.chosenModel === "string") {
        modelHint = data.chosenModel;
      } else if (kind === "direct" && typeof data?.targetModel === "string") {
        modelHint = data.targetModel;
      }

      const modeProfileId =
        typeof data?.modeProfileId === "string" ? data.modeProfileId : undefined;

      const id = `assistant-${Date.now()}`;

      appendMessage({
        id,
        role: "assistant",
        text: assistantText,
        kind,
        modeProfileId,
        modelHint,
      });

      setLastOutput({
        id,
        kind,
        modeProfileId,
        modelHint,
        replyText: assistantText,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Chat API request failed:", error);

      const id = `assistant-error-${Date.now()}`;
      const errorText = "Network error while calling /api/chat.";

      appendMessage({ id, role: "assistant", text: errorText });

      setLastOutput({
        id,
        kind: undefined,
        modeProfileId: selectedModelId,
        modelHint: undefined,
        replyText: errorText,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleAttachChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  return (
    <section className="flex flex-1 flex-col bg-background min-h-0">
      {/* Header */}
      <header className="px-6 py-3 border-b border-border flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">RocketGPT</span>
          <span className="text-xs text-muted-foreground">
            AI Orchestrator · Chat
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 font-medium border border-border">
            Using: <span className="font-semibold">{selectedModelId}</span>
          </span>

          <button
            type="button"
            onClick={onFocus}
            className="hidden sm:inline-flex items-center rounded-full border border-border px-3 py-1 hover:bg-muted"
          >
            Focus
          </button>

          <button
            type="button"
            onClick={onToggleSessions}
            className="hidden sm:inline-flex items-center rounded-full border border-border px-2 py-1 hover:bg-muted"
          >
            {sessionsOpen ? "Hide sessions" : "Show sessions"}
          </button>

          <button
            type="button"
            onClick={onToggleTools}
            className="hidden sm:inline-flex items-center rounded-full border border-border px-2 py-1 hover:bg-muted"
          >
            {toolsOpen ? "Hide tools" : "Show tools"}
          </button>

          <span className="text-muted-foreground hidden md:inline">
            Plan: Bronze · Status: OK
          </span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 text-sm">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={isUser ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  "max-w-xl rounded-lg px-4 py-3 " +
                  (isUser
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-muted/40")
                }
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {isUser ? "You" : "RocketGPT"}
                  </div>
                  {!isUser && msg.kind && (
                    <span
                      className={
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold " +
                        (msg.kind === "auto"
                          ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                          : msg.kind === "workflow"
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : "bg-slate-500/20 border-slate-500/40 text-slate-200")
                      }
                    >
                      {msg.kind.toUpperCase()}
                      {msg.modelHint && (
                        <span className="font-normal">{` · ${msg.modelHint}`}</span>
                      )}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <footer className="border-t border-border px-4 py-3">
        <div className="mx-auto max-w-3xl flex flex-col gap-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {attachments.map((file) => (
                <span
                  key={file.name}
                  className="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5"
                >
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <textarea
              ref={textareaRef}
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary min-h-[44px] max-h-40 overflow-y-auto"
              rows={1}
              placeholder="Message RocketGPT..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                  Attach
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAttachChange}
                />
              </label>
              <span>In future, tools like Figma-AI and code agents will appear here.</span>
            </div>
            <button
              type="button"
              onClick={() => void handleSend()}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Send
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
}
