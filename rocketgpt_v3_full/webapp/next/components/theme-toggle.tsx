"use client";

import React from "react";
import { useTheme } from "@/components/theme-provider";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System (Auto)" },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <section
      className="
        space-y-3 rounded-lg border 
        border-gray-300 dark:border-neutral-700
        bg-white dark:bg-neutral-900/60
        p-4
      "
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Appearance / Theme
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Choose how RocketGPT looks. When set to System, theme will follow your OS preference.
          </p>
        </div>
        <span
          className="
            inline-flex items-center rounded-full border 
            border-gray-300 dark:border-neutral-700
            bg-gray-100 dark:bg-neutral-950
            px-3 py-1 text-xs
            text-gray-800 dark:text-gray-200
          "
        >
          Active: <span className="ml-1 font-medium capitalize">{resolvedTheme}</span>
        </span>
      </header>

      <div className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value as any)}
              className={[
                "inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-medium transition",

                isActive
                  ? "border-blue-500 bg-blue-600 text-white shadow-sm"
                  : "border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800",
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
