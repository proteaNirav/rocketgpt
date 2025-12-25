import { test, expect } from "@playwright/test";

test.describe("Global /api/status endpoint", () => {
  test("GET /api/status aggregates orchestrator and tester health", async ({ request }) => {
    const response = await request.get("/api/status");

    const httpStatus = response.status();
    console.log("/api/status HTTP status:", httpStatus);
    expect(httpStatus).toBe(200);

    const body = await response.json();
    console.log("/api/status body:", body);

    expect(typeof body).toBe("object");
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("services");

    const services: any = body.services;
    expect(typeof services).toBe("object");
    expect(services).toHaveProperty("orchestrator");
    expect(services).toHaveProperty("tester");

    const orch: any = services.orchestrator;
    const tester: any = services.tester;

    // We only assert minimal shape so we stay robust:
    expect(typeof orch).toBe("object");
    expect(typeof tester).toBe("object");

    // If underlying health endpoints return "success: true" we expect overall success
    // (Already asserted at body.success === true above)
  });
});
