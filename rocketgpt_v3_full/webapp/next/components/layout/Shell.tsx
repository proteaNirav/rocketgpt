"use client";

import Sidebar from "./Sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full">
      {/* LEFT SIDEBAR only */}
      <Sidebar collapsed={false} onToggle={() => {}} />

      {/* MAIN CONTENT – full width */}
      <div className="flex-1 px-4 py-4">
        {children}
      </div>
    </div>
  );
}

