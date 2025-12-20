import { test, expect } from "@playwright/test";

test.describe("RocketGPT Tester UI", () => {
  test("loads the Tester page and shows the shared header", async ({ page }) => {
    // Go to the Tester page
    await page.goto("/tester");

    // Basic sanity: page loaded with HTTP 200 internally
    // (Playwright will throw if navigation fails)

    // Expect the shared header brand/title to be visible somewhere on the page
    await expect(page.getByText("RocketGPT")).toBeVisible();

    // Optional: wait for any key UI element if ever we add data-testid later
    // e.g. await expect(page.getByTestId("tester-root")).toBeVisible();
  });
});
