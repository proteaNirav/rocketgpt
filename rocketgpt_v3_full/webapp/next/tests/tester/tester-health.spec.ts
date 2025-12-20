import { test, expect } from "@playwright/test";

test.describe("Tester health endpoint", () => {
  test("GET /api/tester/health responds with success", async ({ request }) => {
    const response = await request.get("/api/tester/health");

    const status = response.status();
    console.log("Tester /health status:", status);
    expect(status).toBe(200);

    const body = await response.json();
    console.log("Tester /health body:", body);

    expect(typeof body).toBe("object");
    expect(body).toHaveProperty("success", true);
    expect(body).toHaveProperty("service", "tester");
    expect(body).toHaveProperty("message");
    expect(typeof body.message).toBe("string");
  });
});
