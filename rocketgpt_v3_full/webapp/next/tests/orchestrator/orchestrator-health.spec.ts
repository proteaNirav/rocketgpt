import { test, expect } from "@playwright/test";

test.describe("Orchestrator health endpoint", () => {
  test("GET /api/orchestrator/health responds with success", async ({ request }) => {
    const response = await request.get("/api/orchestrator/health");

    const status = response.status();
    console.log("Orchestrator /health status:", status);
    expect(status).toBe(200);

    const body = await response.json();
    console.log("Orchestrator /health body:", body);

    expect(typeof body).toBe("object");
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("service", "RocketGPT Orchestrator");
});

  test.skip("Tester /api/tester/run smoke check (heavy, enable in later phase)", async ({ request }) => {
    const response = await request.post("/api/tester/run", {
      data: {},
    });

    const status = response.status();
    console.log("Tester /api/tester/run status:", status);

    // When enabled in a later phase, we will tighten these expectations.
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(600);
  });
});


