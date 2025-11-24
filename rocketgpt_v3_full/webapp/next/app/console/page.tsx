// app/console/page.tsx
// @ts-nocheck
"use client";

import { useState, FormEvent } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export default function ConsolePage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: text },
      {
        id: Date.now() + 1,
        role: "assistant",
        content:
          "(Demo reply) This is the RocketGPT Console. Wiring to the real backend will come next.",
      },
    ]);

    setInput("");
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top header row */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            RocketGPT Console
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            3-panel playground to try prompts, see context, and inspect
            results.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setLeftOpen((v) => !v)}
            className="rounded border border-border px-2 py-1 hover:bg-accent"
          >
            {leftOpen ? "Hide left" : "Show left"}
          </button>
          <button
            type="button"
            onClick={() => setRightOpen((v) => !v)}
            className="rounded border border-border px-2 py-1 hover:bg-accent"
          >
            {rightOpen ? "Hide right" : "Show right"}
          </button>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* LEFT PANE */}
        {leftOpen && (
          <aside className="flex w-60 min-w-[220px] max-w-xs flex-col rounded-xl border bg-card">
            <div className="border-b px-3 py-2 text-sm font-medium">
              Sources &amp; Tools
            </div>
            <div className="flex-1 overflow-auto px-3 py-2 text-xs text-muted-foreground space-y-2">
              <div>
                <div className="font-semibold text-foreground">Engines</div>
                <ul className="mt-1 list-disc pl-4 space-y-1">
                  <li>GPT-5.1 (primary)</li>
                  <li>Claude / Gemini (future)</li>
                </ul>
              </div>
              <div>
                <div className="mt-3 font-semibold text-foreground">
                  Tools
                </div>
                <ul className="mt-1 list-disc pl-4 space-y-1">
                  <li>Web search</li>
                  <li>Runbooks</li>
                  <li>Self-Improve tasks</li>
                </ul>
              </div>
              <p className="mt-3 text-[11px]">
                This panel will later let you choose models, tools,
                environments, and test cases for RocketGPT.
              </p>
            </div>
          </aside>
        )}

        {/* MIDDLE CHAT PANE */}
        <section className="flex flex-1 flex-col rounded-xl border bg-card">
          <header className="flex items-center justify-between border-b px-4 py-2">
            <div>
              <div className="text-sm font-medium">Chat</div>
              <p className="text-xs text-muted-foreground">
                Type a prompt and see the conversation here.
              </p>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-auto px-4 py-3 text-sm">
            {messages.length === 0 ? (
              <div className="mt-6 text-center text-xs text-muted-foreground">
                No messages yet. Try asking RocketGPT something like
                <br />
                <span className="font-medium text-foreground">
                  “Summarise today&apos;s RocketGPT status for me.”
                </span>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    "flex " +
                    (m.role === "user" ? "justify-end" : "justify-start")
                  }
                >
                  <div
                    className={
                      "max-w-[75%] rounded-xl px-3 py-2 text-xs md:text-sm " +
                      (m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground")
                    }
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70">
                      {m.role === "user" ? "You" : "RocketGPT"}
                    </div>
                    <div>{m.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="border-t px-3 py-2">
            <div className="flex gap-2">
              <textarea
                className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                rows={2}
                placeholder="Type your prompt here…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className="self-end rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Send
              </button>
            </div>
          </form>
        </section>

        {/* RIGHT PANE */}
        {rightOpen && (
          <aside className="flex w-72 min-w-[240px] max-w-sm flex-col rounded-xl border bg-card">
            <div className="border-b px-3 py-2 text-sm font-medium">
              Context &amp; Inspector
            </div>
            <div className="flex-1 space-y-3 overflow-auto px-3 py-2 text-xs text-muted-foreground">
              <div>
                <div className="font-semibold text-foreground">
                  Last request
                </div>
                <p className="mt-1">
                  This will later show the raw payload RocketGPT sends to
                  the engines (models, tools, system prompts, etc.).
                </p>
              </div>
              <div>
                <div className="mt-3 font-semibold text-foreground">
                  Upcoming features
                </div>
                <ul className="mt-1 list-disc pl-4 space-y-1">
                  <li>Show JSON of the run</li>
                  <li>Self-Improve suggestions</li>
                  <li>Latency &amp; cost breakdown</li>
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
