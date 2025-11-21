"use client";

import React from "react";
import { useEngineOutput } from "./EngineOutputContext";

export function WorkbenchPane() {
  const { lastOutput } = useEngineOutput();

  return (
    <aside className="hidden lg:flex lg:flex-col w-80 border-l bg-muted/10">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold">Workbench</h2>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Tools
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-sm">
        {/* Last engine output */}
        <section className="rounded-md border border-border bg-background px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-muted-foreground">
              Last Engine Output
            </div>
            {lastOutput?.kind && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground border border-border">
                {lastOutput.kind.toUpperCase()}
                {lastOutput.modelHint ? ` · ${lastOutput.modelHint}` : ""}
              </span>
            )}
          </div>
          {lastOutput ? (
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground max-h-48 overflow-y-auto">
              {lastOutput.replyText}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">
              Engine replies from the chat will appear here.
            </p>
          )}
        </section>

        {/* Code */}
        <section>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            Code
          </div>
          <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            Generated code, snippets and diffs will appear here.
          </div>
        </section>

        {/* Simulation */}
        <section>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            Simulation
          </div>
          <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            Test runs and scenario previews will be shown here.
          </div>
        </section>

        {/* Design */}
        <section>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            Design · Figma-AI
          </div>
          <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            UI layouts and Figma-style suggestions will be surfaced here.
          </div>
        </section>
      </div>
    </aside>
  );
}
