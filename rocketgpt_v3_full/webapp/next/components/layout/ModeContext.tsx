"use client";

import React, { createContext, useContext, useState } from "react";

type ModeContextValue = {
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
};

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

/**
 * ModeProvider
 * Holds the currently selected model/mode profile for RocketGPT.
 * Default: Auto router ("auto-smart-router").
 */
export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [selectedModelId, setSelectedModelId] = useState<string>("auto-smart-router");

  return (
    <ModeContext.Provider value={{ selectedModelId, setSelectedModelId }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return ctx;
}
