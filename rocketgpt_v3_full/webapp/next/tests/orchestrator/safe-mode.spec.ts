import { test, expect } from "@playwright/test";

test("orchestrator must block execute-all when Safe-Mode is enabled", async ({ request }) => {
  const status = await request.get("/api/orchestrator/status");
  const statusJson = await status.json();

  if (!statusJson.orchestrator?.safe_mode?.enabled) { test.skip(true, "Safe-Mode is not enabled in this run."); }

  const internalKey = process.env.RGPT_INTERNAL_KEY || "";

  const response = await request.post("/api/orchestrator/builder/execute-all", {
    data: {},
    headers: { "x-rgpt-internal": internalKey }
  });

  // If no key provided, expect auth failure and skip
  if (!internalKey) {
    expect([401, 403]).toContain(response.status());
    test.skip(true, "Auth test skipped - RGPT_INTERNAL_KEY not available");
    return;
  }

  // With valid key, expect safe mode block (403)
  expect(response.status()).toBe(403);

  const body = await response.json();
  expect(body.success).toBe(false);

  // Accept either error_code variant (older SAFE_MODE_* or current SAFE_MODE_ACTIVE)
  const code = body.error_code || body.error?.code || "";
  expect(String(code)).toMatch(/SAFE_MODE/i);
});

