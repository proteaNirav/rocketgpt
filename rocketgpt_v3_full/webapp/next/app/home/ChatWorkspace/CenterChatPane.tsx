"use client";

import { useState, FormEvent } from "react";
import { useHomeChat } from "./useHomeChat";

export function CenterChatPane() {
  const { messages, sending, error, sendMessage, resetKey } = useHomeChat();
  const [input, setInput] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    await sendMessage(text);
    setInput("");
  };

  return (
    <section className="flex h-full min-h-[420px] flex-col gap-4">
      {/* Demo mode banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        Demo mode: RocketGPT is running with placeholder responses for Phase-1 UAT.
      </div>

      {/* Welcome / info card */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <h2 className="text-sm font-semibold">
          Welcome to the RocketGPT Home Chat Workspace.
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Below you can send prompts to the demo orchestrator endpoint. The transcript is now live
          and driven by the Home Chat hook.
        </p>
        {error && (
          <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      {/* Chat card: scrollable transcript + pinned composer */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background/60">
        {/* Transcript area */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Start typing to chat with RocketGPT
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  Your conversation will appear here
                </p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.role === "user"
                      ? "bg-emerald-600 text-emerald-50"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-medium opacity-70">
                    {m.name}
                    {m.time ? " · " + m.time : ""}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer area pinned to bottom - key resets input on New Chat */}
        <div key={resetKey} className="border-t border-border bg-background/80 px-4 py-3">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <textarea
                className="min-h-[44px] max-h-32 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                placeholder="Type a prompt to RocketGPT…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex h-[44px] items-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-emerald-50 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Composer is wired to the demo orchestrator via <code>/api/demo/chat</code>. Layout
              adapts automatically to your screen height.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}


export default CenterChatPane;

