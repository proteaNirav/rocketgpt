"use client";

import React, { useMemo } from "react";
import { useMode } from "./ModeContext";

type ModelCategory =
  | "auto"
  | "llm"
  | "maths"
  | "finance"
  | "uiux"
  | "development"
  | "db"
  | "bigdata"
  | "workflow";

type ModelOption = {
  id: string;
  label: string;          // What user sees in dropdown (actual model name)
  category: ModelCategory;
  categoryLabel: string;  // Display label for the category (LLM, Maths, ...)
  engine: string;         // Underlying engine label
  description?: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  // Auto – RocketGPT decides best engine based on context
  {
    id: "auto-smart-router",
    label: "Auto (RocketGPT decides)",
    category: "auto",
    categoryLabel: "Auto",
    engine: "Dynamic Router",
    description: "RocketGPT chooses the best model per request",
  },

  // LLM – general chat / reasoning
  {
    id: "llm-gpt-5.1",
    label: "GPT 5.1",
    category: "llm",
    categoryLabel: "LLM",
    engine: "GPT 5.1",
    description: "Flagship general-purpose LLM",
  },
  {
    id: "llm-gpt-4.1",
    label: "GPT 4.1",
    category: "llm",
    categoryLabel: "LLM",
    engine: "GPT 4.1",
    description: "Reliable, balanced reasoning",
  },
  {
    id: "llm-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    category: "llm",
    categoryLabel: "LLM",
    engine: "Claude 3.5 Sonnet",
    description: "Strong reasoning and long-form answers",
  },

  // Development – coding, reviews, refactors
  {
    id: "dev-gpt-5.1",
    label: "GPT 5.1 (Dev)",
    category: "development",
    categoryLabel: "Development",
    engine: "GPT 5.1",
    description: "Coding, refactors, architecture",
  },
  {
    id: "dev-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet (Dev)",
    category: "development",
    categoryLabel: "Development",
    engine: "Claude 3.5 Sonnet",
    description: "Code review, reasoning-heavy dev tasks",
  },

  // DB – SQL, schema design, query tuning
  {
    id: "db-gpt-4.1",
    label: "GPT 4.1 (SQL & Schema)",
    category: "db",
    categoryLabel: "DB",
    engine: "GPT 4.1",
    description: "SQL queries, indexing, schema planning",
  },
  {
    id: "db-gemini-1.5-pro",
    label: "Gemini 1.5 Pro (SQL)",
    category: "db",
    categoryLabel: "DB",
    engine: "Gemini 1.5 Pro",
    description: "Data modelling, analytics queries",
  },

  // BigData – pipelines, ETL, analytics architectures
  {
    id: "bigdata-gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    category: "bigdata",
    categoryLabel: "BigData",
    engine: "Gemini 1.5 Pro",
    description: "Pipelines, ETL, lakehouse patterns",
  },
  {
    id: "bigdata-gpt-4.1",
    label: "GPT 4.1",
    category: "bigdata",
    categoryLabel: "BigData",
    engine: "GPT 4.1",
    description: "Architectures, cluster planning, docs",
  },

  // Maths – calculations, logic heavy
  {
    id: "maths-gpt-4.1",
    label: "GPT 4.1",
    category: "maths",
    categoryLabel: "Maths",
    engine: "GPT 4.1",
    description: "Math-heavy reasoning and proofs",
  },
  {
    id: "maths-gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    category: "maths",
    categoryLabel: "Maths",
    engine: "Gemini 1.5 Flash",
    description: "Fast calculations and numeric work",
  },

  // Finance – markets, analytics, dashboards
  {
    id: "finance-gpt-4.1",
    label: "GPT 4.1",
    category: "finance",
    categoryLabel: "Finance",
    engine: "GPT 4.1",
    description: "Financial analysis, reports, summaries",
  },
  {
    id: "finance-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    category: "finance",
    categoryLabel: "Finance",
    engine: "Claude 3.5 Sonnet",
    description: "Narrative financial commentary",
  },

  // UI/UX – copy, layout, Figma-style prompts
  {
    id: "uiux-claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    category: "uiux",
    categoryLabel: "UI/UX",
    engine: "Claude 3.5 Sonnet",
    description: "Product copy, UX flows, IA",
  },
  {
    id: "uiux-gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    category: "uiux",
    categoryLabel: "UI/UX",
    engine: "Gemini 1.5 Flash",
    description: "Variant ideas, fast iterations",
  },

  // Workflow – multi-model orchestration (demo)
  {
    id: "workflow-multi-model-orchestrator",
    label: "Multi-model Orchestrator (demo)",
    category: "workflow",
    categoryLabel: "Workflow",
    engine: "Composite",
    description: "Use multiple models in a chained flow",
  },
];

const CATEGORY_ORDER: ModelCategory[] = [
  "auto",
  "llm",
  "development",
  "db",
  "bigdata",
  "maths",
  "finance",
  "uiux",
  "workflow",
];

const CATEGORY_LABEL: Record<ModelCategory, string> = {
  auto: "Auto",
  llm: "LLM",
  maths: "Maths",
  finance: "Finance",
  uiux: "UI/UX",
  development: "Development",
  db: "DB",
  bigdata: "BigData",
  workflow: "Workflow",
};

export function ModelSelector() {
  const { selectedModelId, setSelectedModelId } = useMode();

  const groups = useMemo(() => {
    const byCategory = new Map<ModelCategory, ModelOption[]>();
    for (const m of MODEL_OPTIONS) {
      if (!byCategory.has(m.category)) {
        byCategory.set(m.category, []);
      }
      byCategory.get(m.category)!.push(m);
    }

    const ordered: [ModelCategory, ModelOption[]][] = [];
    for (const cat of CATEGORY_ORDER) {
      const items = byCategory.get(cat);
      if (items && items.length > 0) {
        ordered.push([cat, items]);
      }
    }
    return ordered;
  }, []);

  const selectedModel = MODEL_OPTIONS.find((m) => m.id === selectedModelId);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden md:inline text-muted-foreground">
        Mode
      </span>
      <div className="relative">
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
          className="text-xs border border-border rounded-full bg-background pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
        >
          {groups.map(([category, items]) => {
            const groupLabel = CATEGORY_LABEL[category];
            return (
              <optgroup key={category} label={groupLabel}>
                {items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-1 flex items-center pr-1 text-[10px] text-muted-foreground">
          ▾
        </span>
      </div>

      {selectedModel && (
        <span className="hidden lg:inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-[11px] text-primary-foreground">
          <span className="font-semibold">{selectedModel.categoryLabel}</span>
          <span className="h-3 w-px bg-primary/60" />
          <span className="text-[10px] opacity-90">
            {selectedModel.engine}
          </span>
        </span>
      )}
    </div>
  );
}

