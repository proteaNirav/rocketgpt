"use client";

import React, { useState } from "react";

type CollapsibleWrapperProps = {
  children: React.ReactNode;
  side: "left" | "right";
};

/**
 * CollapsibleWrapper
 * ------------------
 * STEP-3: Adds simple local collapse/expand state.
 * - Left panel: typically Sessions
 * - Right panel: typically Inspector
 *
 * Layout is flex-based:
 * - Side panes control their own width via Tailwind classes.
 * - Center pane uses flex-1 and expands when sides are collapsed.
 */
export default function CollapsibleWrapper({
  children,
  side,
}: CollapsibleWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);

  const widthClass = collapsed
    ? "basis-[16px] max-w-[16px]"
    : side === "left"
    ? "basis-[280px] max-w-[320px]"
    : "basis-[280px] max-w-[360px]";

  const borderClass =
    side === "left" ? "border-r border-slate-800" : "border-l border-slate-800";

  const toggleLabel =
    side === "left"
      ? collapsed
        ? "›"
        : "‹"
      : collapsed
      ? "‹"
      : "›";

  const toggleTitle =
    side === "left"
      ? collapsed
        ? "Expand sessions panel"
        : "Collapse sessions panel"
      : collapsed
      ? "Expand inspector panel"
      : "Collapse inspector panel";

  return (
    <div
      data-pane-side={side}
      data-collapsed={collapsed ? "true" : "false"}
      className={
        "relative h-full flex flex-col bg-slate-950/80 transition-all duration-200 " +
        widthClass +
        " " +
        borderClass
      }
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        title={toggleTitle}
        className={
          "absolute top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full " +
          "border border-slate-700 bg-slate-900 text-xs text-slate-300 " +
          "hover:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-500 " +
          (side === "left" ? "right-[-12px]" : "left-[-12px]")
        }
      >
        <span className="leading-none">{toggleLabel}</span>
      </button>

      <div
        className={
          "flex-1 overflow-hidden " +
          (collapsed ? "opacity-0 pointer-events-none" : "opacity-100")
        }
      >
        {children}
      </div>
    </div>
  );
}
