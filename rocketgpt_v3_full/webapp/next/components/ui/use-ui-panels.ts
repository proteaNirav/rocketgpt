"use client";
import { create } from "zustand";

interface UIState {
  sidebar: boolean;   // left global sidebar
  sessions: boolean;  // middle sessions panel
  tools: boolean;     // right workbench panel
  toggleSidebar: () => void;
  toggleSessions: () => void;
  toggleTools: () => void;
  setPanels: (patch: Partial<Pick<UIState, "sidebar" | "sessions" | "tools">>) => void;
}

export const useUIPanels = create<UIState>((set) => ({
  sidebar: true,
  sessions: true,
  tools: true,
  toggleSidebar: () => set((s) => ({ sidebar: !s.sidebar })),
  toggleSessions: () => set((s) => ({ sessions: !s.sessions })),
  toggleTools: () => set((s) => ({ tools: !s.tools })),
  setPanels: (patch) =>
    set((s) => ({
      ...s,
      ...patch,
    })),
}));
