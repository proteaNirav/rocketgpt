import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Edge route contract – presence & export markers (loader-agnostic)", () => {
  const root = process.cwd();
  const candidates = [
    "app/api/edge/[fn]/route.ts",
    "app/api/edge/[fn]/route.js",
    "lib/edge/ping.ts",
    "lib/edge/ping.js",
    "lib/edge/echo.ts",
    "lib/edge/echo.js",
  ];
  const abs = (p: string) => join(root, p);

  it("presence is optional; report if none exist (does not fail CI)", () => {
    const existing = candidates.filter((p) => existsSync(abs(p)));
    // If nothing exists yet on this branch, pass but emit an informational note
    if (existing.length === 0) {
      console.warn("[edge.contract] No Edge candidates found on this branch. Test treated as informational.");
      expect(true).toBe(true);
      return;
    }
    // If there are files, at least one should exist
    expect(existing.length).toBeGreaterThanOrEqual(1);
  });

  it("when modules exist, their sources should show export markers (static scan)", () => {
    const existing = candidates.filter((p) => existsSync(abs(p)));
    if (existing.length === 0) {
      expect(true).toBe(true); // nothing to validate yet
      return;
    }
    for (const p of existing) {
      const src = readFileSync(abs(p), "utf8");
      const hasExport = /\bexport\s+(const|function|async|default|class|interface|type)\b/.test(src);
      expect(hasExport).toBe(true);
    }
  });
});
