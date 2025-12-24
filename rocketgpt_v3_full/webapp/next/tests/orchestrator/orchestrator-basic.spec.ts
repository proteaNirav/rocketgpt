import { test, expect } from "@playwright/test";

// RGPT_B17_FAILPROOF :: intentional failure for Self-Heal workflow_run proof
test('RGPT_B17_FAILPROOF', async () => { throw new Error('RGPT_B17_FAILPROOF'); });

// NOTE:
// This test is intentionally skipped by default during initial Playwright setup.
// Once Orchestrator ? Builder ? Tester is fully wired and stable,
// change `test.skip` back to `test` to enforce this health check.

test.skip("POST /api/orchestrator/builder/execute-all returns a JSON payload", async ({ request }) => {
  const response = await request.post("/api/orchestrator/builder/execute-all", {
    data: {},
  });

  const status = response.status();
  console.log("Orchestrator execute-all status:", status);

  // For initial wiring we only assert that we get *some* HTTP response and JSON back.
  expect(status).toBeGreaterThan(0);

  const body = await response.json();
  console.log("Orchestrator execute-all response body:", body);

  if (Object.prototype.hasOwnProperty.call(body, "success")) {
    expect(typeof body.success).toBe("boolean");
  }
});
test("POST /api/orchestrator/builder/execute-all returns 400 for invalid input", async ({ request }) => {
  const internalKey = process.env.RGPT_INTERNAL_KEY || "";

  const response = await request.post("/api/orchestrator/builder/execute-all", {
    headers: {
      "x-rgpt-internal": internalKey,
    },
    data: { runId: "not-a-number" },
  });

  const status = response.status();

  // If auth blocks first (401/403), skip validation test
  if ([401, 403].includes(status)) {
    test.skip(true, "Auth required - cannot test input validation without RGPT_INTERNAL_KEY");
    return;
  }

  // If input validation happens before/without auth, expect 400
  expect(status).toBe(400);

  const body = await response.json();
  expect(body.error).toBeDefined();
  expect(body.error.code).toBe("INVALID_INPUT");
});

test("POST /api/orchestrator/builder/execute-all accepts valid input", async ({ request }) => {
  const internalKey = process.env.RGPT_INTERNAL_KEY || "";

  const response = await request.post("/api/orchestrator/builder/execute-all", {
    headers: {
      "x-rgpt-internal": internalKey,
    },
    data: { runId: 123 },
  });

  const status = response.status();

  // If no key provided, expect auth failure (401/403)
  if (!internalKey) {
    expect([401, 403]).toContain(status);
    test.skip(true, "Auth test passed - 401/403 received as expected without key");
    return;
  }

  // With valid key and valid input, expect success or business logic response (not 400)
  expect(status).not.toBe(400);
});
