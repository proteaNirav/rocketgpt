"use client";

import React from "react";
import { useTheme } from "@/components/theme-provider";

export function HeaderThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Cycle: light -> dark -> system -> light
  const handleClick = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const icon = resolvedTheme === "dark" ? "🌙" : "☀️";
  const label =
    theme === "system"
      ? "System"
      : theme === "dark"
      ? "Dark"
      : "Light";

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        inline-flex items-center gap-1 rounded-full border
        border-gray-300 dark:border-neutral-700
        bg-white dark:bg-neutral-900
        px-3 py-1 text-xs font-medium
        text-gray-700 dark:text-gray-200
        hover:bg-gray-100 dark:hover:bg-neutral-800
        transition
      "
      title="Toggle theme (Light → Dark → System)"
    >
      <span className="text-sm" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
