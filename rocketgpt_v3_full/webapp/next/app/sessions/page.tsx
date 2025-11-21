"use client";

import React, { useState } from "react";
import { SessionsTable } from "./SessionsTable"; // named import

export default function SessionsPage() {
  const [listCollapsed, setListCollapsed] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  // During build / server-side render, avoid rendering SessionsTable
  if (typeof window === "undefined") {
    return (
      <div className="flex h-full w-full bg-slate-950 text-slate-50">
        <section className="flex h-full w-full flex-col border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Sessions
            </h2>
            <span className="text-[10px] text-slate-500">
              Preparing sessions UI…
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-4 py-3 text-sm text-slate-400">
            This page will fully load in the browser.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-50">
      {/* Left: Sessions list */}
      {!listCollapsed && (
        <section className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950/80">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <h1 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Sessions
            </h1>
            <button
              type="button"
              onClick={() => setListCollapsed(true)}
              className="text-[10px] rounded-md border border-slate-700 px-1.5 py-0.5 text-slate-300 hover:bg-slate-800"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <SessionsTable />
          </div>
        </section>
      )}
      {listCollapsed && (
        <button
          type="button"
          onClick={() => setListCollapsed(false)}
          className="flex h-full w-4 items-center justify-center border-r border-slate-800 text-[10px] text-slate-400 hover:bg-slate-900"
          title="Show sessions list"
        >
          &raquo;
        </button>
      )}

      {/* Center: Chat / transcript */}
      <section className="flex min-w-0 flex-1 flex-col border-r border-slate-800 bg-slate-950">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Conversation
          </h2>
          <span className="text-[10px] text-slate-500">
            Select a session to view details
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-4 py-3 text-sm text-slate-300">
          {/* Hook up actual session detail component here */}
          <p className="text-slate-500">
            Conversation content will appear here once wired to the active session.
          </p>
        </div>
      </section>

      {/* Right: Metadata / context */}
      {!detailsCollapsed && (
        <section className="hidden h-full w-80 flex-col border-l border-slate-800 bg-slate-950/90 lg:flex">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Context
            </h3>
            <button
              type="button"
              onClick={() => setDetailsCollapsed(true)}
              className="text-[10px] rounded-md border border-slate-700 px-1.5 py-0.5 text-slate-300 hover:bg-slate-800"
            >
              Hide
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-3 py-2 text-xs text-slate-400 space-y-2">
            <p>
              Session metadata, tags, models, and runbook links can be shown here.
            </p>
            <ul className="space-y-1">
              <li>- Model: gpt-4.x / claude</li>
              <li>- Last activity: –</li>
              <li>- Tokens used: –</li>
            </ul>
          </div>
        </section>
      )}
      {detailsCollapsed && (
        <button
          type="button"
          onClick={() => setDetailsCollapsed(false)}
          className="hidden h-full w-4 items-center justify-center border-l border-slate-800 text-[10px] text-slate-400 hover:bg-slate-900 lg:flex"
          title="Show context panel"
        >
          &laquo;
        </button>
      )}
    </div>
  );
}
