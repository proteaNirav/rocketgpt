"use client";

import React, { createContext, useContext, useState } from "react";

export type OrchestratorKind = "auto" | "workflow" | "direct";

export type EngineOutput = {
  id: string;
  kind: OrchestratorKind | undefined;
  modeProfileId?: string;
  modelHint?: string;
  replyText: string;
  createdAt: string;
};

type EngineOutputContextValue = {
  lastOutput: EngineOutput | null;
  setLastOutput: (o: EngineOutput | null) => void;
};

const EngineOutputContext = createContext<EngineOutputContextValue | undefined>(
  undefined
);

export function EngineOutputProvider({ children }: { children: React.ReactNode }) {
  const [lastOutput, setLastOutput] = useState<EngineOutput | null>(null);

  return (
    <EngineOutputContext.Provider value={{ lastOutput, setLastOutput }}>
      {children}
    </EngineOutputContext.Provider>
  );
}

export function useEngineOutput(): EngineOutputContextValue {
  const ctx = useContext(EngineOutputContext);
  if (!ctx) {
    throw new Error("useEngineOutput must be used within EngineOutputProvider");
  }
  return ctx;
}
