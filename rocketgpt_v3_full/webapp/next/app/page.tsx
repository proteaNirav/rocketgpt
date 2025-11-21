"use client";

import React, { useState } from "react";
import { SessionsPane } from "../components/home/SessionsPane";
import { ChatWorkspace } from "../components/home/ChatWorkspace";
import { WorkbenchPane } from "../components/home/WorkbenchPane";
import { EngineOutputProvider } from "../components/home/EngineOutputContext";

export default function Home() {
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);

  const handleFocus = () => {
    setSessionsOpen(false);
    setToolsOpen(false);
  };

  return (
    <EngineOutputProvider>
      <div className="flex h-full min-h-0 bg-background">
        <div className="flex flex-1 overflow-hidden">
          {sessionsOpen && <SessionsPane />}

          <ChatWorkspace
            sessionsOpen={sessionsOpen}
            toolsOpen={toolsOpen}
            onToggleSessions={() => setSessionsOpen((v) => !v)}
            onToggleTools={() => setToolsOpen((v) => !v)}
            onFocus={handleFocus}
          />

          {toolsOpen && <WorkbenchPane />}
        </div>
      </div>
    </EngineOutputProvider>
  );
}
