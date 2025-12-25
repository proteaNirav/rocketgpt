import { test, expect } from "@playwright/test";

test.describe("RocketGPT Settings UI", () => {
  test("loads the Settings page and shows the shared header", async ({ page }) => {
    await page.goto("/settings");

    // Expect the brand/header link to be visible (more specific than getByText("RocketGPT"))
    await expect(
      page.getByRole("link", { name: /RocketGPT/i })
    ).toBeVisible();

    // Optional: later we can assert specific settings controls by test id
  });
});
