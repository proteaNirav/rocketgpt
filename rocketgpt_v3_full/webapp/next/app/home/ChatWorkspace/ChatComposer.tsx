"use client";

import React, { useState, FormEvent } from "react";

interface ChatComposerProps {
  onSend: (text: string) => Promise<void>;
  sending: boolean;
}

export default function ChatComposer({ onSend, sending }: ChatComposerProps) {
  const [value, setValue] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || sending) return;

    setValue("");
    await onSend(text);
  };

  const disabled = sending || !value.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 border-t border-slate-800 pt-2 space-y-1.5"
    >
      <div className="rounded-lg border border-slate-800 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <textarea
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              sending
                ? "Sending message to RocketGPT demo orchestrator..."
                : "Type a prompt to RocketGPT..."
            }
            className="flex-1 resize-none rounded-md border border-slate-800 bg-slate-950/80 px-2 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/80 focus:border-emerald-500/80"
          />
          <div className="flex flex-col gap-1 min-w-[80px]">
            <button
              type="submit"
              className="rounded-md border border-emerald-500/70 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled}
            >
              {sending ? "Sending..." : "Send"}
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-200 hover:bg-slate-900"
            >
              ⋯ More
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>
              Composer is now wired to <code className="font-mono">/api/demo/chat</code>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Enter to send • Shift+Enter for newline (later)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Ready • Demo chat API</span>
        </div>
        <div className="flex items-center gap-2">
          <span>vNext workspace</span>
          <span className="text-slate-600">•</span>
          <span>Requests go via /api/demo/chat</span>
        </div>
      </div>
    </form>
  );
}
