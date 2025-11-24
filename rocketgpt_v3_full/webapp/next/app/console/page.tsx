// app/console/page.tsx
"use client";

import { useState } from "react";

type ChatMessage = {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
};

export default function ConsolePage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "system",
      content:
        "Welcome to the RocketGPT Console. This playground will later talk to your real engines.",
    },
  ]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const nextId = messages.length ? messages[messages.length - 1].id + 1 : 1;

    setMessages([
      ...messages,
      { id: nextId, role: "user", content: trimmed },
      {
        id: nextId + 1,
        role: "assistant",
        content:
          "Placeholder reply from RocketGPT. In v4 Core AI this will call the real orchestration engine.",
      },
    ]);

    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-[540px] gap-4">
      {/* LEFT PANEL */}
      {leftOpen && (
        <section className="flex w-64 flex-col rounded-xl border bg-card/70 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Inputs / Sessions</h2>
            <button
              type="button"
              onClick={() => setLeftOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-auto text-xs text-muted-foreground">
            <p>
              This panel will host recent sessions, presets and runbooks. For
              now it is a static placeholder.
            </p>
          </div>
        </section>
      )}

      {/* CENTER CHAT PANEL */}
      <section className="flex min-w-0 flex-1 flex-col rounded-xl border bg-card/80 shadow-sm">
        <header className="flex items-center justify-between border-b px-4 py-2">
          <div>
            <h2 className="text-sm font-semibold">Console Chat</h2>
            <p className="text-xs text-muted-foreground">
              Ask RocketGPT anything about your stack, tests or agents.
            </p>
          </div>
          <div className="flex gap-2">
            {!leftOpen && (
              <button
                type="button"
                onClick={() => setLeftOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Show left
              </button>
            )}
            {!rightOpen && (
              <button
                type="button"
                onClick={() => setRightOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Show right
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-auto px-4 py-3 text-sm">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user" ? "flex justify-end" : "flex justify-start"
              }
            >
              <div
                className={`max-w-[72%] rounded-lg px-3 py-2 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                  {m.role === "user"
                    ? "You"
                    : m.role === "assistant"
                    ? "RocketGPT"
                    : "System"}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <footer className="border-t bg-background/60 px-4 py-3">
          <div className="flex gap-2">
            <textarea
              className="min-h-[44px] max-h-32 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Type your prompt here, Shift+Enter for new line, Enter to send…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              onClick={handleSend}
              className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Send
            </button>
          </div>
        </footer>
      </section>

      {/* RIGHT PANEL */}
      {rightOpen && (
        <section className="flex w-80 flex-col rounded-xl border bg-card/70 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Context / Tools</h2>
            <button
              type="button"
              onClick={() => setRightOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-auto text-xs text-muted-foreground">
            <p>
              This panel will host model selection, tools, debug info and
              self-improve controls. For now it is static placeholder content.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
