import { test, expect } from "@playwright/test";

test.describe("RocketGPT Logs UI", () => {
  test("loads the Logs page and shows the shared header", async ({ page }) => {
    await page.goto("/logs");

    // Expect header
    await expect(page.getByText("RocketGPT")).toBeVisible();

    // Optional future selectors may go here
  });
});
