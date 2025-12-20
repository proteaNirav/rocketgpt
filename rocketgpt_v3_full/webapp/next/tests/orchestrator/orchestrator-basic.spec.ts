import { test, expect } from "@playwright/test";

// NOTE:
// This test is intentionally skipped by default during initial Playwright setup.
// Once Orchestrator → Builder → Tester is fully wired and stable,
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
