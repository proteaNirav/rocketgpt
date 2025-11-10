import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Edge route contract – HTTP handler exports (static & guarded)", () => {
  // Add or change candidates as your project evolves
  const candidates = [
    "app/api/edge/[fn]/route.ts",
    "app/api/edge/[fn]/route.js",
  ];
  const abs = (p: string) => join(process.cwd(), p);

  it("skips if Edge route files are absent; otherwise asserts at least one HTTP method export", () => {
    const existing = candidates.filter((p) => existsSync(abs(p)));
    if (existing.length === 0) {
      console.warn("[edge.contract.exports] No Edge route files found; skipping handler assertions.");
      expect(true).toBe(true);
      return;
    }

    const httpMethodRegex =
      /\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g;

    let asserted = 0;
    for (const p of existing) {
      const src = readFileSync(abs(p), "utf8");
      const hasHandler = httpMethodRegex.test(src);
      // reset lastIndex for safety if reused
      httpMethodRegex.lastIndex = 0;
      expect(hasHandler).toBe(true);
      asserted++;
    }
    expect(asserted).toBeGreaterThanOrEqual(1);
  });
});
