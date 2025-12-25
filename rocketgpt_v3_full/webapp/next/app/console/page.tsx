"use client";

import { useState, FormEvent } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export default function ConsolePage() {
  const [showTools, setShowTools] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: text,
    };

    const demoReply: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content:
        "Demo reply from RocketGPT console. In a later version this will call the real orchestrator backend.",
    };

    setMessages((prev) => [...prev, userMessage, demoReply]);
    setInput("");
  };

  const ChatPanel = () => (
    <div className="flex flex-1 flex-col rounded-lg border border-slate-700 bg-slate-950/60">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Conversation</h2>
          <p className="text-xs text-slate-400">
            Type a prompt and see how RocketGPT would respond.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 space-y-3 text-sm">
        {messages.length === 0 ? (
          <div className="mt-4 text-center text-xs text-slate-400">
            <p>No messages yet.</p>
            <p className="mt-1">
              Try a small test prompt to verify the layout and behaviour of the
              console.
            </p>
            <p className="mt-2 text-slate-300">
              Example prompt one summarise RocketGPT go live status.
            </p>
            <p className="text-slate-300">
              Example prompt two list pending items for the self improve engine.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                "flex " + (m.role === "user" ? "justify-end" : "justify-start")
              }
            >
              <div
                className={
                  "max-w-[75%] rounded-xl px-3 py-2 text-xs md:text-sm " +
                  (m.role === "user"
                    ? "bg-emerald-600 text-emerald-50"
                    : "bg-slate-800 text-slate-100")
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

      <form onSubmit={handleSend} className="border-t border-slate-700 px-3 py-2">
        <div className="flex gap-2">
          <textarea
            className="flex-1 resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            rows={2}
            placeholder="Type your prompt here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="self-end rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-emerald-50 hover:bg-emerald-500"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );

  // Full-screen focus mode: hides side menus and grey column visually
  if (focusMode) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-50">
              RocketGPT Console
            </h1>
            <p className="text-xs text-slate-400">
              Focus mode hides navigation and side panels so you can work only
              with this console.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800"
          >
            Exit focus
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6">
          <ChatPanel />
        </div>
      </div>
    );
  }

  // Normal mode: three panel layout inside the regular shell
  return (
    <div className="flex flex-col gap-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            RocketGPT Console
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Three panel control room to experiment with prompts tools and
            routing.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowTools((v) => !v)}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-1 hover:bg-slate-800"
          >
            {showTools ? "Hide tools" : "Show tools"}
          </button>
          <button
            type="button"
            onClick={() => setShowInspector((v) => !v)}
            className="rounded border border-slate-600 bg-slate-900 px-3 py-1 hover:bg-slate-800"
          >
            {showInspector ? "Hide inspector" : "Show inspector"}
          </button>
          <button
            type="button"
            onClick={() => setFocusMode(true)}
            className="rounded border border-emerald-600 bg-emerald-600 px-3 py-1 font-medium text-emerald-50 hover:bg-emerald-500"
          >
            Focus
          </button>
        </div>
      </div>

      <section
        className={
          "grid gap-4 " +
          (showTools && showInspector
            ? "grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_260px]"
            : showTools && !showInspector
            ? "grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]"
            : !showTools && showInspector
            ? "grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]"
            : "grid-cols-1")
        }
      >
        {showTools && (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
            <h2 className="text-sm font-semibold text-slate-100">
              Engines and tools
            </h2>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-200">
                Engines
              </div>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>GPT 5.1 as primary engine</li>
                <li>Claude and Gemini as future engines</li>
              </ul>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-200">
                Tools
              </div>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Runbooks</li>
                <li>Self improve jobs</li>
                <li>Web and code search in future</li>
              </ul>
            </div>
            <p className="mt-3 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              Later this panel will connect to real model routing tools and
              environments not only static placeholders.
            </p>
          </div>
        )}

        <ChatPanel />

        {showInspector && (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-xs text-slate-300">
            <h2 className="text-sm font-semibold text-slate-100">Inspector</h2>
            <p className="mt-2">
              This panel will later show request and response metadata for the
              current session.
            </p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Selected model and tools</li>
              <li>Routing decisions</li>
              <li>Latency and cost summary</li>
              <li>Links to logs and self improve runs</li>
            </ul>
            <p className="mt-3 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
              For now the layout is wired and safe for go live while the backend
              orchestration is still a placeholder.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
