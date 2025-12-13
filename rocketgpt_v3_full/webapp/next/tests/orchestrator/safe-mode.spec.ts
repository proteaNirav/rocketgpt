import { test, expect } from "@playwright/test";

test("orchestrator must block execute-all when Safe-Mode is enabled", async ({ request }) => {
  const status = await request.get("/api/orchestrator/status");
  const statusJson = await status.json();

  if (!statusJson.orchestrator?.safe_mode?.enabled) {
    throw new Error("Safe-Mode must be enabled before running this test.");
  }

  const internalKey = process.env.RGPT_INTERNAL_KEY;
  if (!internalKey) {
    throw new Error("RGPT_INTERNAL_KEY must be set for this test (route requires internal auth).");
  }

  const response = await request.post("/api/orchestrator/builder/execute-all", {
    data: {},
    headers: { "x-rgpt-internal": internalKey }
  });

  expect(response.status()).toBe(403);

  const body = await response.json();
  expect(body.success).toBe(false);

  // Accept either error_code variant (older SAFE_MODE_* or current SAFE_MODE_ACTIVE)
  const code = body.error_code || body.error?.code || "";
  expect(String(code)).toMatch(/SAFE_MODE/i);
});
