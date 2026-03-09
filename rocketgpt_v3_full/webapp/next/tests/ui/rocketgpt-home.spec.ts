import { test, expect } from "@playwright/test";

test.describe("RocketGPT Home UI", () => {
  test("loads the homepage and shows header", async ({ page }) => {
    await page.goto("/");

    // Title check – still expect RocketGPT, but log it if mismatch
    const title = await page.title();
    console.log("RocketGPT Home title:", title);
    await expect(title.toLowerCase()).toContain("rocketgpt");

    // Basic sanity check: header (banner) should be visible
    const header = page.getByRole("banner");
    await expect(header).toBeVisible();
  });

  test("Design Mode OFF sends runtime chat request and does not render workflow draft for trivial prompt", async ({
    page,
  }) => {
    let runtimeCalls = 0;
    await page.route("**/api/demo/chat", async (route) => {
      runtimeCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          mode: "demo",
          reply: "operational",
          usage: null,
          error: null,
        }),
      });
    });

    await page.goto("/home");
    await expect(page.getByRole("button", { name: /Design Mode: Off/i })).toBeVisible();
    await page.getByPlaceholder("Type a prompt to RocketGPT…").fill("Say only: operational");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("operational")).toBeVisible();
    await expect(page.getByText("Suggested workflow draft")).toHaveCount(0);
    expect(runtimeCalls).toBeGreaterThan(0);
  });

  test("Design Mode ON renders workflow draft and does not call runtime chat endpoint", async ({ page }) => {
    let runtimeCalls = 0;
    await page.route("**/api/demo/chat", async (route) => {
      runtimeCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          mode: "demo",
          reply: "should-not-be-used",
          usage: null,
          error: null,
        }),
      });
    });

    await page.goto("/home");
    await page.getByRole("button", { name: /Design Mode: Off/i }).click();
    await expect(page.getByRole("button", { name: /Design Mode: On/i })).toBeVisible();

    await page.getByPlaceholder("Type a prompt to RocketGPT…").fill("Create a workflow draft for runtime health checks");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Suggested workflow draft")).toBeVisible();
    await expect(page.getByText("Open Workflow Builder")).toBeVisible();
    expect(runtimeCalls).toBe(0);
  });

  test("Explicit workflow prompt still generates draft while Design Mode is OFF", async ({ page }) => {
    let runtimeCalls = 0;
    await page.route("**/api/demo/chat", async (route) => {
      runtimeCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          mode: "demo",
          reply: "unused",
          usage: null,
          error: null,
        }),
      });
    });

    await page.goto("/home");
    await expect(page.getByRole("button", { name: /Design Mode: Off/i })).toBeVisible();
    await page
      .getByPlaceholder("Type a prompt to RocketGPT…")
      .fill("Please design a workflow draft to monitor runtime heartbeat and generate a builder plan");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Suggested workflow draft")).toBeVisible();
    expect(runtimeCalls).toBe(0);
  });
});
